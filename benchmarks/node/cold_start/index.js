const http = require('http');
const { performance } = require('perf_hooks');

// Parse command line arguments
function parseArgs() {
    const args = process.argv.slice(2);
    const config = {
        port: 3000,
        iterations: 10,
        timeout: 10000
    };

    args.forEach(arg => {
        if (arg.startsWith('--port=')) {
            config.port = parseInt(arg.split('=')[1]);
        } else if (arg.startsWith('--iterations=')) {
            config.iterations = parseInt(arg.split('=')[1]);
        } else if (arg.startsWith('--timeout=')) {
            config.timeout = parseInt(arg.split('=')[1]);
        }
    });

    return config;
}

// Make HTTP request to test server readiness
function testServerReady(port, timeout) {
    return new Promise((resolve) => {
        const maxAttempts = Math.floor(timeout / 10);
        let attempts = 0;

        const tryRequest = () => {
            const req = http.get(`http://localhost:${port}/`, (res) => {
                if (res.statusCode === 200) {
                    resolve(true);
                } else {
                    attempts++;
                    if (attempts < maxAttempts) {
                        setTimeout(tryRequest, 10);
                    } else {
                        resolve(false);
                    }
                }
            });

            req.on('error', () => {
                attempts++;
                if (attempts < maxAttempts) {
                    setTimeout(tryRequest, 10);
                } else {
                    resolve(false);
                }
            });

            req.setTimeout(100);
        };

        tryRequest();
    });
}

// Measure single cold start
async function measureColdStart(port, timeout, iteration) {
    return new Promise(async (resolve) => {
        console.error(`Cold start measurement ${iteration}...`);
        
        const startTime = performance.now();
        
        // Create HTTP server
        const server = http.createServer((req, res) => {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok', message: 'Cold start complete' }));
        });

        // Start server
        server.listen(port, async () => {
            // Test server readiness
            const ready = await testServerReady(port, timeout);
            
            if (ready) {
                const coldStartTime = performance.now() - startTime;
                console.error(`Cold start ${iteration}: ${coldStartTime.toFixed(2)}ms`);
                
                server.close(() => {
                    resolve({ success: true, time: coldStartTime });
                });
            } else {
                console.error(`Cold start ${iteration}: timeout`);
                server.close(() => {
                    resolve({ success: false, time: 0 });
                });
            }
        });

        server.on('error', (err) => {
            console.error(`Cold start ${iteration}: server error:`, err.message);
            resolve({ success: false, time: 0 });
        });
    });
}

async function main() {
    const config = parseArgs();
    
    console.error(`Running cold start benchmark: ${config.iterations} iterations, port ${config.port}, timeout ${config.timeout}ms`);

    let totalColdStartTime = 0;
    let successfulMeasurements = 0;

    for (let i = 1; i <= config.iterations; i++) {
        const result = await measureColdStart(config.port, config.timeout, i);
        
        if (result.success) {
            totalColdStartTime += result.time;
            successfulMeasurements++;
        }

        // Wait between iterations
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (successfulMeasurements === 0) {
        console.error('No successful cold start measurements completed');
        process.exit(1);
    }

    const avgColdStartTime = totalColdStartTime / successfulMeasurements;

    const output = {
        operations: successfulMeasurements,
        totalTimeMs: totalColdStartTime,
        coldStartTimeMs: avgColdStartTime
    };

    // Output JSON result to stdout
    console.log(JSON.stringify(output));
}

main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
}); 