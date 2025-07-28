// @ts-nocheck
// Bun runtime types are available at runtime

// Parse command line arguments  
function parseArgs() {
    const args = Bun.argv.slice(2);
    const config = {
        port: 3000,
        iterations: 10,
        timeout: 10000
    };

    args.forEach((arg: string) => {
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

// Test server readiness
async function testServerReady(port: number, timeout: number): Promise<boolean> {
    const maxAttempts = Math.floor(timeout / 10);
    let attempts = 0;

    while (attempts < maxAttempts) {
        try {
            const response = await fetch(`http://localhost:${port}/`, {
                signal: AbortSignal.timeout(100)
            });
            
            if (response.ok) {
                return true;
            }
        } catch (error) {
            // Connection refused or timeout - server not ready yet
        }
        
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    return false;
}

// Measure single cold start
async function measureColdStart(port: number, timeout: number, iteration: number): Promise<{ success: boolean; time: number }> {
    console.error(`Cold start measurement ${iteration}...`);
    
    const startTime = performance.now();
    
    // Create Bun server
    const server = Bun.serve({
        port,
        fetch(request) {
            return new Response(
                JSON.stringify({ status: 'ok', message: 'Cold start complete' }),
                { headers: { 'Content-Type': 'application/json' } }
            );
        },
    });

    try {
        // Test server readiness
        const ready = await testServerReady(port, timeout);
        
        if (ready) {
            const coldStartTime = performance.now() - startTime;
            console.error(`Cold start ${iteration}: ${coldStartTime.toFixed(2)}ms`);
            
            server.stop();
            return { success: true, time: coldStartTime };
        } else {
            console.error(`Cold start ${iteration}: timeout`);
            server.stop();
            return { success: false, time: 0 };
        }
    } catch (error) {
        console.error(`Cold start ${iteration}: error:`, error);
        server.stop();
        return { success: false, time: 0 };
    }
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