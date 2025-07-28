const { spawn } = require('child_process');
const http = require('http');
const { performance } = require('perf_hooks');

// Parse command line arguments
function parseArgs() {
    const args = process.argv.slice(2);
    const config = {
        port: '3000',
        startClients: 10,
        maxClients: 500,
        stepSize: 25,
        duration: 10,
        threshold: 0.9
    };

    args.forEach(arg => {
        if (arg.startsWith('--port=')) {
            config.port = arg.split('=')[1];
        } else if (arg.startsWith('--start-clients=')) {
            config.startClients = parseInt(arg.split('=')[1]);
        } else if (arg.startsWith('--max-clients=')) {
            config.maxClients = parseInt(arg.split('=')[1]);
        } else if (arg.startsWith('--step-size=')) {
            config.stepSize = parseInt(arg.split('=')[1]);
        } else if (arg.startsWith('--duration=')) {
            config.duration = parseFloat(arg.split('=')[1]);
        } else if (arg.startsWith('--threshold=')) {
            config.threshold = parseFloat(arg.split('=')[1]);
        }
    });

    return config;
}

// Test if server is running
function isServerRunning(port) {
    return new Promise((resolve) => {
        const req = http.get(`http://localhost:${port}`, (res) => {
            resolve(res.statusCode === 200);
        });
        req.on('error', () => resolve(false));
        req.setTimeout(1000, () => {
            req.destroy();
            resolve(false);
        });
    });
}

// Test a specific concurrency level using wrk
function testConcurrencyLevel(clients, duration, port) {
    return new Promise((resolve, reject) => {
        const durationStr = `${Math.floor(duration)}s`;
        const threads = require('os').cpus().length;
        
        const wrk = spawn('wrk', [
            '-t', threads.toString(),
            '-c', clients.toString(),
            '-d', durationStr,
            `http://localhost:${port}`
        ]);

        let output = '';
        let errorOutput = '';

        wrk.stdout.on('data', (data) => {
            output += data.toString();
        });

        wrk.stderr.on('data', (data) => {
            errorOutput += data.toString();
        });

        wrk.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`wrk exited with code ${code}: ${errorOutput}`));
                return;
            }

            const rps = parseWrkRPS(output);
            if (rps === null) {
                reject(new Error('Could not parse RPS from wrk output'));
                return;
            }

            resolve(rps);
        });
    });
}

// Parse RPS from wrk output
function parseWrkRPS(output) {
    const lines = output.split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.includes('Requests/sec:')) {
            const parts = trimmed.split(/\s+/);
            if (parts.length >= 2) {
                const rps = parseFloat(parts[1]);
                if (!isNaN(rps)) {
                    return rps;
                }
            }
        }
    }
    return null;
}

// Sleep helper
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    const config = parseArgs();

    // Check if server is running
    if (!(await isServerRunning(config.port))) {
        console.error(`HTTP server not running on port ${config.port}`);
        process.exit(1);
    }

    console.log(`Testing concurrency limits from ${config.startClients} to ${config.maxClients} clients (step: ${config.stepSize})`);

    const startTime = performance.now();
    let maxRPS = 0;
    let maxConcurrency = config.startClients;
    let totalTests = 0;

    // Test increasing concurrency levels
    for (let clients = config.startClients; clients <= config.maxClients; clients += config.stepSize) {
        totalTests++;
        console.log(`Testing ${clients} concurrent clients...`);

        try {
            const rps = await testConcurrencyLevel(clients, config.duration, config.port);
            console.log(`  -> ${clients} clients: ${rps.toFixed(2)} RPS`);

            if (rps > maxRPS) {
                maxRPS = rps;
                maxConcurrency = clients;
            } else if (rps < maxRPS * config.threshold) {
                // Performance degraded below threshold, stop testing
                console.log(`Performance degraded below ${(config.threshold * 100).toFixed(0)}% threshold. Max concurrency: ${maxConcurrency} clients`);
                break;
            }

            // Small delay between tests
            await sleep(500);
        } catch (error) {
            console.error(`Error testing ${clients} clients: ${error.message}`);
            continue;
        }
    }

    const totalTime = performance.now() - startTime;

    const result = {
        operations: totalTests,
        totalTimeMs: totalTime,
        maxConcurrentClients: maxConcurrency,
        maxRequestsPerSecond: maxRPS,
        concurrencyThreshold: config.threshold
    };

    console.log(JSON.stringify(result));
}

main().catch(error => {
    console.error('Error:', error.message);
    process.exit(1);
}); 