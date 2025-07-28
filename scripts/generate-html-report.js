const fs = require('fs');
const path = require('path');

// Central configuration object for extensible test metadata
const REPORT_CONFIG = {
    'file_write': {
        category: 'I/O Performance',
        title: 'Small File Writes',
        primaryMetric: 'operationsPerSecond',
        metricUnit: 'ops/sec',
        sortOrder: 'desc',
        description: 'Measures the performance of writing small files to the filesystem. This test is fundamental for applications that handle logging, user-uploaded content, or file-based data stores.',
        betterWhen: 'higher',
        calculation: 'Data: Write 1000 files of 1KB each to disk • Calculation: Total operations (1000) ÷ Total time (seconds)'
    },
    'file_read': {
        category: 'I/O Performance', 
        title: 'Small File Reads',
        primaryMetric: 'operationsPerSecond',
        metricUnit: 'ops/sec',
        sortOrder: 'desc',
        description: 'Evaluates the speed of reading small files from disk. Critical for applications that frequently access configuration files, templates, or cached data.',
        betterWhen: 'higher',
        calculation: 'Data: Read 1000 pre-existing files of 1KB each from disk • Calculation: Total operations (1000) ÷ Total time (seconds)'
    },
    'json_write': {
        category: 'Data Processing',
        title: 'JSON Serialization',
        primaryMetric: 'operationsPerSecond',
        metricUnit: 'ops/sec', 
        sortOrder: 'desc',
        description: 'Tests the speed of converting JavaScript objects to JSON strings. Essential for API responses and data persistence in modern web applications.',
        betterWhen: 'higher',
        calculation: 'Data: Serialize 1000 complex nested objects to JSON strings • Calculation: Total serializations (1000) ÷ Total time (seconds)'
    },
    'concurrency_test': {
        category: 'Concurrency & Parallelism',
        title: 'Concurrent Task Execution',
        primaryMetric: 'operationsPerSecond',
        metricUnit: 'ops/sec',
        sortOrder: 'desc',
        description: 'Measures the efficiency of the runtime\'s scheduler in handling thousands of concurrent, non-blocking operations. This is crucial for high-throughput network services and event-driven applications.',
        betterWhen: 'higher',
        warning: 'Operations/Second in this context measures scheduler throughput, not I/O. Results are not comparable to other test categories.',
        calculation: 'Data: Spawn 1M lightweight concurrent tasks (promises/goroutines) that complete immediately • Calculation: Total tasks (1M) ÷ Total time (seconds)'
    },
    'http_server': {
        category: 'Network Performance',
        title: 'HTTP Server Load Test',
        primaryMetric: 'requestsPerSecond',
        metricUnit: 'req/sec',
        sortOrder: 'desc',
        description: 'Evaluates HTTP server performance under load. Tests throughput, latency, and resource efficiency with concurrent connections.',
        betterWhen: 'higher',
        hasNoOpsMetric: false,
        isHttpServer: true,
        calculation: 'Data: HTTP server handles 100 concurrent connections for 15 seconds • Calculation: Total requests ÷ Total time (requests/sec) and average latency (ms)'
    },
    'cold_start': {
        category: 'System Performance',
        title: 'Cold Start Time',
        primaryMetric: 'coldStartTimeMs',
        metricUnit: 'ms',
        sortOrder: 'asc',
        description: 'Measures the time from process start to first successful HTTP response. Critical for serverless and microservice performance.',
        betterWhen: 'lower',
        hasNoOpsMetric: true,
        calculation: 'Data: Start HTTP server and measure time until first successful response • Calculation: Average cold start time across multiple iterations'
    }
};

// Modern Happy Hues inspired color scheme
const TECH_COLORS = {
    'go': { primary: '#00BFAE', secondary: 'rgba(0, 191, 174, 0.1)', border: 'rgba(0, 191, 174, 0.3)' },
    'node': { primary: '#8BC34A', secondary: 'rgba(139, 195, 74, 0.1)', border: 'rgba(139, 195, 74, 0.3)' },
    'bun': { primary: '#FFB300', secondary: 'rgba(255, 179, 0, 0.1)', border: 'rgba(255, 179, 0, 0.3)' },
    'python': { primary: '#3572A5', secondary: 'rgba(53, 114, 165, 0.1)', border: 'rgba(53, 114, 165, 0.3)' },
    'rust': { primary: '#B7410E', secondary: 'rgba(183, 65, 14, 0.1)', border: 'rgba(183, 65, 14, 0.3)' }
};

class ModernHTMLReportGenerator {
    constructor() {
        this.reportsDir = process.argv[2] || 'reports';
        this.outputFile = path.join(this.reportsDir, 'index.html');
    }

    async generateReport() {
        try {
            console.log('🔍 Scanning for JSON reports...');
            const reports = await this.loadReports();
            
            if (reports.length === 0) {
                console.log('❌ No JSON reports found');
                return;
            }

            console.log(`📊 Found ${reports.length} report(s), generating modern HTML report...`);
            const html = this.generateHTML(reports);
            
            await fs.promises.writeFile(this.outputFile, html);
            console.log(`✅ Modern HTML report generated: ${this.outputFile}`);
            
        } catch (error) {
            console.error('❌ Error generating HTML report:', error);
            process.exit(1);
        }
    }

    async loadReports() {
        const files = await fs.promises.readdir(this.reportsDir);
        const jsonFiles = files.filter(file => file.endsWith('.json'));
        
        const reports = [];
        for (const file of jsonFiles) {
            try {
                const filePath = path.join(this.reportsDir, file);
                const content = await fs.promises.readFile(filePath, 'utf8');
                if (!content) {
                    console.warn(`⚠️  Skipping empty file: ${file}`);
                    continue;
                }
                const report = JSON.parse(content);

                if (!report.metadata || !report.results) {
                    throw new Error('Missing metadata or results');
                }

                reports.push({ filename: file, ...report });
            } catch (error) {
                console.warn(`⚠️  Skipping invalid report ${file}: ${error.message}`);
            }
        }
        
        return reports.sort((a, b) => new Date(b.metadata.reportGeneratedAt) - new Date(a.metadata.reportGeneratedAt));
    }

    generateHTML(reports) {
        const latestReport = reports[0];
        // Merge results from all reports instead of just using the latest one
        const allResults = this.mergeAllReports(reports);
        const aggregatedResults = this.aggregateAndCategorizeResults(allResults);
        const topPerformers = this.calculateTopPerformers(allResults);
        
        return this.htmlTemplate(latestReport, aggregatedResults, topPerformers);
    }

    // ===== NEW METHOD: Merge results from all reports =====
    mergeAllReports(reports) {
        const allResults = [];
        
        reports.forEach(report => {
            if (report.results && Array.isArray(report.results)) {
                allResults.push(...report.results);
            }
        });
        
        // Remove duplicates based on tech+test combination (keep the latest)
        const resultMap = new Map();
        allResults.forEach(result => {
            const key = `${result.tech}-${result.test}`;
            if (!resultMap.has(key) || new Date(result.timestamp || 0) > new Date(resultMap.get(key).timestamp || 0)) {
                resultMap.set(key, result);
            }
        });
        
        return Array.from(resultMap.values());
    }

    // ===== HTML TEMPLATES (Separation of Concerns) =====

    htmlTemplate(report, aggregatedResults, topPerformers) {
        return `<!DOCTYPE html>
<html lang="en">
${this.headTemplate()}
<body>
    <div class="app">
        ${this.headerTemplate(report)}
        ${this.navigationTemplate()}
        <main class="main">
            ${this.heroSectionTemplate(topPerformers)}
            ${this.systemInfoTemplate(report.metadata)}
            ${this.categorizedSectionsTemplate(aggregatedResults)}
            ${this.rawDataTemplate(report)}
        </main>
        ${this.footerTemplate()}
    </div>
    ${this.scriptsTemplate(aggregatedResults)}
</body>
</html>`;
    }

    headTemplate() {
        return `<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Benchie-techs Performance Report</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
    <style>${this.cssTemplate()}</style>
</head>`;
    }

    headerTemplate(report) {
        return `<header class="header">
    <div class="container">
        <div class="header-content">
            <div class="logo">
                <div class="logo-icon">🏆</div>
                <h1 class="logo-text">
                    <span class="logo-main">Benchie</span>
                    <span class="logo-sub">techs</span>
                </h1>
            </div>
            <div class="header-stats">
                <div class="stat-card">
                    <div class="stat-value">${report.results.length}</div>
                    <div class="stat-label">Benchmarks</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${new Set(report.results.map(r => r.tech)).size}</div>
                    <div class="stat-label">Technologies</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${new Date(report.metadata.reportGeneratedAt).toLocaleDateString()}</div>
                    <div class="stat-label">Generated</div>
                </div>
            </div>
        </div>
    </div>
</header>`;
    }

    navigationTemplate() {
        const categories = [...new Set(Object.values(REPORT_CONFIG).map(config => config.category))];
        
        return `<nav class="navigation">
    <div class="container">
        <div class="nav-links">
            <a href="#hero" class="nav-link active">Overview</a>
            <a href="#system" class="nav-link">System</a>
            ${categories.map(category => 
                `<a href="#${this.slugify(category)}" class="nav-link">${category}</a>`
            ).join('')}
            <a href="#raw-data" class="nav-link">Raw Data</a>
        </div>
    </div>
</nav>`;
    }

    heroSectionTemplate(topPerformers) {
        return `<section class="hero" id="hero">
    <div class="container">
        <div class="hero-content">
            <h2 class="hero-title">Performance Champions</h2>
            <p class="hero-subtitle">Discover which technologies excel in different performance categories</p>
            
            <div class="champions-grid">
                <div class="champion-card winner">
                    <div class="champion-badge">🚀</div>
                    <h3 class="champion-title">Speed Champion</h3>
                    <div class="champion-tech">${topPerformers.fastestIO.tech}</div>
                    <div class="champion-metric">${topPerformers.fastestIO.value.toLocaleString()} ops/sec</div>
                    <div class="champion-category">${topPerformers.fastestIO.test}</div>
                </div>
                
                <div class="champion-card">
                    <div class="champion-badge">⚡</div>
                    <h3 class="champion-title">Processing Power</h3>
                    <div class="champion-tech">${topPerformers.fastestProcessing.tech}</div>
                    <div class="champion-metric">${topPerformers.fastestProcessing.value.toLocaleString()} ops/sec</div>
                    <div class="champion-category">${topPerformers.fastestProcessing.test}</div>
                </div>
                
                <div class="champion-card">
                    <div class="champion-badge">💎</div>
                    <h3 class="champion-title">Memory Efficient</h3>
                    <div class="champion-tech">${topPerformers.mostEfficient.tech}</div>
                    <div class="champion-metric">${topPerformers.mostEfficient.value.toFixed(1)} MB</div>
                    <div class="champion-category">${topPerformers.mostEfficient.test}</div>
                </div>
            </div>
        </div>
    </div>
</section>`;
    }

    systemInfoTemplate(metadata) {
        const { systemInfo, toolVersions } = metadata;
        return `<section class="section" id="system">
    <div class="container">
        <div class="section-header">
            <h2 class="section-title">System Environment</h2>
            <p class="section-subtitle">Hardware and software specifications for these benchmarks</p>
        </div>
        
        <div class="system-grid">
            <div class="system-card">
                <div class="card-icon">🖥️</div>
                <h3 class="card-title">Hardware</h3>
                <div class="system-details">
                    <div class="detail-row">
                        <span class="detail-label">OS</span>
                        <span class="detail-value">${systemInfo.os} (${systemInfo.arch})</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">CPU</span>
                        <span class="detail-value">${systemInfo.cpu}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Cores</span>
                        <span class="detail-value">${systemInfo.cores}</span>
                    </div>
                    <div class="detail-row">
                        <span class="detail-label">Memory</span>
                        <span class="detail-value">${(systemInfo.totalMemoryMB / 1024).toFixed(1)} GB</span>
                    </div>
                </div>
            </div>
            
            <div class="system-card">
                <div class="card-icon">⚙️</div>
                <h3 class="card-title">Runtimes</h3>
                <div class="system-details">
                    ${Object.entries(toolVersions.versions).map(([tool, version]) => `
                        <div class="detail-row">
                            <span class="detail-label">${tool.charAt(0).toUpperCase() + tool.slice(1)}</span>
                            <span class="detail-value">${version}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    </div>
</section>`;
    }

    categorizedSectionsTemplate(categorizedResults) {
        return Object.entries(categorizedResults)
            .map(([category, results]) => this.categorySectionTemplate(category, results))
            .join('');
    }

    categorySectionTemplate(category, results) {
        const categorySlug = this.slugify(category);
        const testsByType = this.groupByTest(results);
        
        return `<section class="section category-section" id="${categorySlug}">
    <div class="container">
        <div class="section-header">
            <h2 class="section-title">${category}</h2>
            <p class="section-subtitle">${this.getCategoryDescription(category)}</p>
        </div>
        
        <div class="tests-grid">
            ${Object.entries(testsByType).map(([testType, testResults]) => 
                this.testCardTemplate(testType, testResults)
            ).join('')}
        </div>
    </div>
</section>`;
    }

    testCardTemplate(testType, results) {
        const config = REPORT_CONFIG[testType];
        if (!config) return '';
        
        const chartId = `chart-${testType}`;
        
        return `<div class="test-card" data-test-type="${testType}">
    <div class="test-header">
        <h3 class="test-title">${config.title}</h3>
        <p class="test-description">${config.description}</p>
        ${config.warning ? `<div class="test-warning">⚠️ ${config.warning}</div>` : ''}
    </div>
    
    <div class="chart-container">
        <canvas id="${chartId}"></canvas>
    </div>
    
    <div class="results-table">
        <div class="table-header">
            <div class="table-cell">Technology</div>
            ${config.isHttpServer ? '<div class="table-cell">Requests/Second</div>' : 
              !config.hasNoOpsMetric ? '<div class="table-cell">Ops/Second</div>' : ''}
            ${config.isHttpServer ? '<div class="table-cell">Avg Latency (ms)</div>' : 
              '<div class="table-cell">Time (ms)</div>'}
            ${config.isHttpServer ? '<div class="table-cell">P95 Latency (ms)</div>' : ''}
            ${config.isHttpServer ? '<div class="table-cell">P99 Latency (ms)</div>' : ''}
            <div class="table-cell">Memory (MB)</div>
            <div class="table-cell">CPU (%)</div>
        </div>
        ${results.map(result => `
            <div class="table-row" style="border-left: 4px solid ${TECH_COLORS[result.tech]?.primary || '#eebbc3'}">
                <div class="table-cell tech-cell">
                    <span class="tech-icon">${this.getTechIcon(result.tech)}</span>
                    <span class="tech-name">${result.tech}</span>
                </div>
                ${config.isHttpServer ? `<div class="table-cell metric-cell">${(result.metrics.requestsPerSecond || 0).toLocaleString()}</div>` : 
                  !config.hasNoOpsMetric ? `<div class="table-cell metric-cell">${(result.metrics.operationsPerSecond || 0).toLocaleString()}</div>` : ''}
                ${config.isHttpServer ? `<div class="table-cell metric-cell">${(result.metrics.latencyAvgMs || 0).toFixed(3)}</div>` : 
                  `<div class="table-cell metric-cell">${(result.metrics.totalTimeMs || 0).toFixed(2)}</div>`}
                ${config.isHttpServer ? `<div class="table-cell metric-cell">${(result.metrics.latencyP95Ms || 0).toFixed(3)}</div>` : ''}
                ${config.isHttpServer ? `<div class="table-cell metric-cell">${(result.metrics.latencyP99Ms || 0).toFixed(3)}</div>` : ''}
                <div class="table-cell metric-cell">${(result.metrics.maxMemoryMB || 0).toFixed(1)}</div>
                <div class="table-cell metric-cell">${(result.metrics.avgCpuPercent || 0).toFixed(1)}</div>
            </div>
        `).join('')}
    </div>
    
    ${config.calculation ? `<div class="test-calculation">
        <strong>Methodology:</strong> ${config.calculation}
    </div>` : ''}
</div>`;
    }

    rawDataTemplate(report) {
        return `<section class="section" id="raw-data">
    <div class="container">
        <div class="section-header">
            <h2 class="section-title">Raw Data</h2>
            <p class="section-subtitle">Complete JSON data for transparency and further analysis</p>
        </div>
        
        <div class="raw-data-card">
            <details>
                <summary class="raw-data-toggle">
                    <span>View Complete JSON Report</span>
                    <span class="toggle-icon">▼</span>
                </summary>
                <pre class="raw-data-content"><code>${JSON.stringify(report, null, 2)}</code></pre>
            </details>
        </div>
    </div>
</section>`;
    }

    footerTemplate() {
        return `<footer class="footer">
    <div class="container">
        <div class="footer-content">
            <div class="footer-brand">
                <div class="footer-logo">
                    <span class="footer-icon">🏆</span>
                    <span class="footer-name">Benchie-techs</span>
                </div>
                <p class="footer-tagline">Performance benchmarking made beautiful</p>
            </div>
            
            <div class="footer-links">
                <a href="https://github.com/appointy/Benchie-techs" target="_blank" rel="noopener" class="footer-link">
                    <span class="link-icon">📱</span>
                    <span>GitHub</span>
                </a>
                <div class="footer-info">
                    Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
                </div>
            </div>
        </div>
    </div>
</footer>`;
    }

    cssTemplate() {
        return `
        /* Happy Hues Inspired Design System */
        :root {
            /* Color Palette inspired by This Section's Hues (from image) */
            --bg-primary: #18161b;         /* Background */
            --bg-secondary: #72757e;       /* Secondary */
            --bg-accent: #7751f0;          /* Button, Highlight, Tertiary */
            --text-primary: #ffffff;       /* Headline, Button text, Main */
            --text-secondary: #94a1b2;     /* Paragraph */
            --text-muted: #ffffff;         /* Button text (same as Headline) */
            --accent-highlight: #735ef0;   /* Highlight */
            --accent-main: #ffffff;        /* Main */
            --accent-stroke: #010101;      /* Stroke */
            --accent-tertiary: #2cb67d;    /* Tertiary */
            --border-soft: #72757e;        /* Use Secondary as border for consistency */
            --shadow-soft: rgba(24, 22, 27, 0.10);
            --shadow-medium: rgba(24, 22, 27, 0.20);
        
            
            /* Tech Colors - Updated Palette */
            --tech-go: #00BFAE;
            --tech-node: #8BC34A;
            --tech-bun: #FFB300;
            --tech-python: #3572A5;
            --tech-rust: #B7410E;
            
            /* Typography */
            --font-primary: 'Inter', system-ui, sans-serif;
            --font-mono: 'JetBrains Mono', monospace;
            
            /* Spacing Scale */
            --space-1: 0.25rem;
            --space-2: 0.5rem;
            --space-3: 0.75rem;
            --space-4: 1rem;
            --space-5: 1.25rem;
            --space-6: 1.5rem;
            --space-8: 2rem;
            --space-10: 2.5rem;
            --space-12: 3rem;
            --space-16: 4rem;
            --space-20: 5rem;
            
            /* Border Radius */
            --radius-sm: 0.25rem;
            --radius-md: 0.5rem;
            --radius-lg: 0.75rem;
            --radius-xl: 1rem;
            --radius-2xl: 1.5rem;
            
            /* Animations */
            --transition-fast: 0.15s ease;
            --transition-normal: 0.3s ease;
            --transition-slow: 0.5s ease;
        }

        /* Reset & Base Styles */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        html {
            scroll-behavior: smooth;
            font-size: 16px;
        }

        body {
            font-family: var(--font-primary);
            background: var(--bg-primary);
            color: var(--text-primary);
            line-height: 1.6;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }

        .app {
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 0 var(--space-6);
        }

        /* Header */
        .header {
            background: linear-gradient(135deg, var(--bg-primary) 0%, var(--accent-stroke) 100%);
            border-bottom: 1px solid var(--accent-blue);
            padding: var(--space-8) 0;
        }

        .header-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: var(--space-8);
        }

        .logo {
            display: flex;
            align-items: center;
            gap: var(--space-3);
        }

        .logo-icon {
            font-size: 2.5rem;
            background: linear-gradient(135deg, var(--bg-accent), var(--accent-blue));
            border-radius: var(--radius-xl);
            width: 4rem;
            height: 4rem;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 20px var(--shadow-soft);
        }

        .logo-text {
            font-size: 2.5rem;
            font-weight: 800;
            line-height: 1;
        }

        .logo-main {
            color: var(--text-primary);
        }

        .logo-sub {
            color: var(--bg-accent);
        }

        .header-stats {
            display: flex;
            gap: var(--space-4);
        }

        .stat-card {
            background: var(--bg-secondary);
            padding: var(--space-4) var(--space-6);
            border-radius: var(--radius-lg);
            text-align: center;
            box-shadow: 0 2px 10px var(--shadow-soft);
            border: 1px solid var(--accent-blue);
        }

        .stat-value {
            font-size: 1.5rem;
            font-weight: 700;
            color: var(--bg-accent);
        }

        .stat-label {
            font-size: 0.875rem;
            color: var(--accent-stroke);
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        /* Navigation */
        .navigation {
            background: var(--bg-primary);
            border-bottom: 1px solid var(--accent-blue);
            position: sticky;
            top: 0;
            z-index: 100;
            box-shadow: 0 2px 10px var(--shadow-soft);
        }

        .nav-links {
            display: flex;
            gap: var(--space-2);
            padding: var(--space-4) 0;
            overflow-x: auto;
        }

        .nav-link {
            color: var(--accent-blue);
            text-decoration: none;
            padding: var(--space-3) var(--space-5);
            border-radius: var(--radius-md);
            font-weight: 500;
            white-space: nowrap;
            transition: all var(--transition-fast);
            border: 2px solid transparent;
        }

        .nav-link:hover,
        .nav-link.active {
            color: var(--text-primary);
            background: var(--bg-accent);
            border-color: var(--accent-blue);
        }

        /* Main Content */
        .main {
            flex: 1;
        }

        .section {
            padding: var(--space-20) 0;
        }

        .section-header {
            text-align: center;
            margin-bottom: var(--space-16);
        }

        .section-title {
            font-size: 3rem;
            font-weight: 800;
            margin-bottom: var(--space-4);
            background: linear-gradient(135deg, var(--bg-accent), var(--accent-blue));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .section-subtitle {
            font-size: 1.25rem;
            color: var(--accent-blue);
            max-width: 600px;
            margin: 0 auto;
        }

        /* Hero Section */
        .hero {
            background: linear-gradient(135deg, var(--bg-primary) 0%, var(--accent-stroke) 100%);
            border-bottom: 1px solid var(--accent-blue);
        }

        .hero-content {
            text-align: center;
        }

        .hero-title {
            font-size: 3.5rem;
            font-weight: 800;
            margin-bottom: var(--space-4);
            background: linear-gradient(135deg, var(--bg-accent), var(--accent-blue));
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .hero-subtitle {
            font-size: 1.5rem;
            color: var(--accent-blue);
            margin-bottom: var(--space-16);
        }

        .champions-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: var(--space-8);
            margin-top: var(--space-12);
        }

        .champion-card {
            background: var(--bg-secondary);
            padding: var(--space-8);
            border-radius: var(--radius-2xl);
            text-align: center;
            box-shadow: 0 8px 30px var(--shadow-soft);
            border: 1px solid var(--accent-blue);
            transition: transform var(--transition-normal);
            position: relative;
            overflow: hidden;
        }

        .champion-card:hover {
            transform: translateY(-8px);
            box-shadow: 0 12px 40px var(--shadow-medium);
        }

        .champion-card.winner {
            border-color: var(--bg-accent);
            background: linear-gradient(135deg, var(--bg-secondary) 0%, var(--bg-accent) 30%);
        }

        .champion-badge {
            font-size: 3rem;
            margin-bottom: var(--space-4);
            background: linear-gradient(135deg, var(--bg-accent), var(--accent-blue));
            border-radius: 50%;
            width: 5rem;
            height: 5rem;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto var(--space-4);
            box-shadow: 0 4px 20px var(--shadow-soft);
        }

        .champion-title {
            font-size: 1.25rem;
            font-weight: 600;
            color: var(--accent-blue);
            margin-bottom: var(--space-3);
        }

        .champion-tech {
            font-size: 2rem;
            font-weight: 800;
            color: var(--accent-stroke);
            margin-bottom: var(--space-2);
            text-transform: capitalize;
        }

        .champion-metric {
            font-size: 1.5rem;
            font-weight: 700;
            color: var(--bg-accent);
            margin-bottom: var(--space-2);
        }

        .champion-category {
            font-size: 0.875rem;
            color: var(--accent-blue);
            font-family: var(--font-mono);
        }

        /* System Info */
        .system-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: var(--space-8);
        }

        .system-card {
            background: var(--bg-secondary);
            padding: var(--space-8);
            border-radius: var(--radius-xl);
            box-shadow: 0 4px 20px var(--shadow-soft);
            border: 1px solid var(--accent-blue);
        }

        .card-icon {
            font-size: 2.5rem;
            margin-bottom: var(--space-4);
            background: var(--bg-accent);
            border-radius: var(--radius-lg);
            width: 4rem;
            height: 4rem;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .card-title {
            font-size: 1.5rem;
            font-weight: 700;
            margin-bottom: var(--space-6);
            color: var(--accent-stroke);
        }

        .system-details {
            display: flex;
            flex-direction: column;
            gap: var(--space-4);
        }

        .detail-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: var(--space-3) 0;
            border-bottom: 1px solid var(--accent-blue);
        }

        .detail-row:last-child {
            border-bottom: none;
        }

        .detail-label {
            font-weight: 500;
            color: var(--accent-blue);
        }

        .detail-value {
            font-family: var(--font-mono);
            font-weight: 600;
            color: var(--accent-blue);
        }

        /* Test Cards */
        .tests-grid {
            display: grid;
            gap: var(--space-12);
        }

        .test-card {
            background: var(--bg-secondary);
            border-radius: var(--radius-2xl);
            box-shadow: 0 8px 30px var(--shadow-soft);
            border: 1px solid var(--accent-blue);
            overflow: hidden;
        }

        .test-header {
            padding: var(--space-8);
            background: linear-gradient(135deg, var(--accent-blue), var(--bg-accent));
            border-bottom: 1px solid var(--accent-blue);
        }

        .test-title {
            font-size: 1.75rem;
            font-weight: 700;
            margin-bottom: var(--space-3);
            color: var(--accent-stroke);
        }

        .test-description {
            color: var(--accent-stroke);
            line-height: 1.7;
            margin-bottom: var(--space-4);
        }

        .test-warning {
            background: linear-gradient(135deg, var(--bg-accent), var(--accent-blue));
            border: 1px solid var(--accent-blue);
            color: var(--accent-stroke);
            padding: var(--space-3) var(--space-4);
            border-radius: var(--radius-md);
            font-size: 0.875rem;
            margin-bottom: var(--space-4);
        }

        .test-calculation {
            background: linear-gradient(135deg, var(--bg-accent), var(--accent-blue));
            border: 1px solid var(--accent-blue);
            color: var(--accent-stroke);
            padding: var(--space-4) var(--space-6);
            border-radius: var(--radius-md);
            font-size: 0.875rem;
            margin: var(--space-6);
            font-family: var(--font-mono);
            line-height: 1.6;
        }

        /* Charts */
        .chart-container {
            padding: var(--space-8);
            background: var(--bg-primary);
            border-bottom: 1px solid var(--accent-blue);
            height: 400px;
        }

        /* Tables */
        .results-table {
            padding: var(--space-6);
        }

        .table-header,
        .table-row {
            display: grid;
            grid-template-columns: 2fr 1fr 1fr 1fr 1fr;
            gap: var(--space-4);
            padding: var(--space-4) var(--space-6);
            align-items: center;
        }

        /* HTTP Server tests have 7 columns: Tech, Requests/sec, Avg Latency, P95, P99, Memory, CPU */
        .test-card[data-test-type="http_server"] .table-header,
        .test-card[data-test-type="http_server"] .table-row {
            grid-template-columns: 2fr 1.2fr 1fr 1fr 1fr 1fr 1fr;
        }

        .table-header {
            background: var(--bg-accent);
            border-radius: var(--radius-md);
            font-weight: 600;
            color: var(--accent-stroke);
            font-size: 0.875rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .table-row {
            border-radius: var(--radius-md);
            margin: var(--space-2) 0;
            background: var(--bg-secondary);
            box-shadow: 0 2px 8px var(--shadow-soft);
            border: 1px solid var(--accent-blue);
        }

        .table-cell {
            padding: var(--space-2);
        }

        .tech-cell {
            display: flex;
            align-items: center;
            gap: var(--space-3);
            font-weight: 600;
        }

        .tech-icon {
            font-size: 1.5rem;
        }

        .tech-name {
            text-transform: capitalize;
            color: var(--accent-stroke);
        }

        .metric-cell {
            font-family: var(--font-mono);
            font-weight: 600;
            color: var(--accent-blue);
            text-align: right;
        }

        /* Raw Data */
        .raw-data-card {
            background: var(--bg-secondary);
            border-radius: var(--radius-xl);
            box-shadow: 0 4px 20px var(--shadow-soft);
            border: 1px solid var(--accent-blue);
            overflow: hidden;
        }

        .raw-data-toggle {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: var(--space-6);
            cursor: pointer;
            font-weight: 600;
            background: var(--bg-accent);
            border-bottom: 1px solid var(--accent-blue);
            color: var(--accent-stroke);
            transition: background-color var(--transition-fast);
        }

        .raw-data-toggle:hover {
            background: var(--accent-blue);
            color: var(--text-primary);
        }

        .toggle-icon {
            transition: transform var(--transition-fast);
        }

        details[open] .toggle-icon {
            transform: rotate(180deg);
        }

        .raw-data-content {
            padding: var(--space-6);
            background: var(--bg-primary);
            font-family: var(--font-mono);
            font-size: 0.875rem;
            line-height: 1.6;
            overflow: auto;
            max-height: 500px;
            color: var(--accent-blue);
        }

        /* Footer */
        .footer {
            background: linear-gradient(135deg, var(--bg-primary), var(--accent-stroke));
            border-top: 1px solid var(--accent-blue);
            padding: var(--space-12) 0;
            margin-top: var(--space-20);
        }

        .footer-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: var(--space-8);
        }

        .footer-brand {
            display: flex;
            flex-direction: column;
            gap: var(--space-2);
        }

        .footer-logo {
            display: flex;
            align-items: center;
            gap: var(--space-3);
        }

        .footer-icon {
            font-size: 1.5rem;
        }

        .footer-name {
            font-size: 1.25rem;
            font-weight: 700;
            color: var(--text-primary);
        }

        .footer-tagline {
            color: var(--accent-blue);
            font-style: italic;
        }

        .footer-links {
            display: flex;
            flex-direction: column;
            align-items: flex-end;
            gap: var(--space-3);
        }

        .footer-link {
            display: flex;
            align-items: center;
            gap: var(--space-2);
            color: var(--bg-accent);
            text-decoration: none;
            font-weight: 500;
            transition: color var(--transition-fast);
        }

        .footer-link:hover {
            color: var(--accent-blue);
        }

        .footer-info {
            font-size: 0.875rem;
            color: var(--accent-blue);
        }

        /* Responsive Design */
        @media (max-width: 768px) {
            .container {
                padding: 0 var(--space-4);
            }

            .header-content {
                flex-direction: column;
                gap: var(--space-6);
                text-align: center;
            }

            .header-stats {
                justify-content: center;
                flex-wrap: wrap;
            }

            .section-title {
                font-size: 2.5rem;
            }

            .hero-title {
                font-size: 2.5rem;
            }

            .champions-grid {
                grid-template-columns: 1fr;
            }

            .system-grid {
                grid-template-columns: 1fr;
            }

            .table-header,
            .table-row {
                grid-template-columns: 1fr;
                gap: var(--space-2);
            }
            
            /* HTTP server tables need horizontal scroll on mobile */
            .test-card[data-test-type="http_server"] .results-table {
                overflow-x: auto;
            }
            
            .test-card[data-test-type="http_server"] .table-header,
            .test-card[data-test-type="http_server"] .table-row {
                grid-template-columns: 2fr 1.2fr 1fr 1fr 1fr 1fr 1fr;
                min-width: 800px;
            }

            .table-cell {
                padding: var(--space-3);
                border-bottom: 1px solid var(--accent-blue);
            }

            .table-cell:last-child {
                border-bottom: none;
            }

            .footer-content {
                flex-direction: column;
                text-align: center;
                gap: var(--space-6);
            }

            .footer-links {
                align-items: center;
            }
        }

        @media (max-width: 480px) {
            .nav-links {
                justify-content: flex-start;
            }

            .chart-container {
                height: 300px;
                padding: var(--space-4);
            }

            .stat-card {
                padding: var(--space-3) var(--space-4);
            }

            .test-header {
                padding: var(--space-6);
            }

            .results-table {
                padding: var(--space-4);
            }

            .champion-card {
                padding: var(--space-6);
            }

            .system-card {
                padding: var(--space-6);
            }

            .section {
                padding: var(--space-12) 0;
            }
        }
        `;
    }

    scriptsTemplate(categorizedResults) {
        const chartDataByTest = {};
        
        Object.entries(categorizedResults).forEach(([category, results]) => {
            const testsByType = this.groupByTest(results);
            
            Object.entries(testsByType).forEach(([testType, testResults]) => {
                const config = REPORT_CONFIG[testType];
                if (!config) return;
                
                const technologies = testResults.map(r => r.tech);
                const primaryMetricData = testResults.map(r => r.metrics[config.primaryMetric] || 0);
                const colors = technologies.map(tech => TECH_COLORS[tech]?.primary || '#E91E63');
                
                chartDataByTest[testType] = {
                    technologies,
                    primaryMetricData,
                    colors,
                    config
                };
            });
        });

        return `<script>
         // Chart.js Configuration with This Section's Hues Theme
         Chart.defaults.color = '#b8c1ec';
         Chart.defaults.backgroundColor = 'rgba(238, 187, 195, 0.1)';
         Chart.defaults.borderColor = 'rgba(184, 193, 236, 0.2)';
         
         const chartOptions = {
             responsive: true,
             maintainAspectRatio: false,
             plugins: {
                 legend: { display: false },
                 tooltip: {
                     backgroundColor: 'rgba(35, 41, 70, 0.95)',
                     titleColor: '#fffffe',
                     bodyColor: '#b8c1ec',
                     borderColor: '#eebbc3',
                     borderWidth: 2,
                     cornerRadius: 12,
                     displayColors: false,
                     titleFont: { family: 'Inter', weight: '600' },
                     bodyFont: { family: 'Inter', weight: '500' }
                 }
             },
             scales: {
                 y: {
                     beginAtZero: true,
                     grid: {
                         color: 'rgba(184, 193, 236, 0.1)',
                         drawBorder: false
                     },
                     ticks: {
                         color: '#b8c1ec',
                         font: { family: 'Inter', weight: '500' }
                     }
                 },
                 x: {
                     grid: { display: false, drawBorder: false },
                     ticks: {
                         color: '#b8c1ec',
                         font: { family: 'Inter', weight: '600' }
                     }
                 }
             }
         };
         
         // Generate charts
         const chartData = ${JSON.stringify(chartDataByTest)};
         
         Object.entries(chartData).forEach(([testType, data]) => {
             const canvas = document.getElementById('chart-' + testType);
             if (!canvas) return;
             
             new Chart(canvas, {
                 type: 'bar',
                 data: {
                     labels: data.technologies.map(tech => tech.charAt(0).toUpperCase() + tech.slice(1)),
                     datasets: [{
                         data: data.primaryMetricData,
                         backgroundColor: data.colors.map(color => color + '30'),
                         borderColor: data.colors,
                         borderWidth: 3,
                         borderRadius: 8,
                         borderSkipped: false
                     }]
                 },
                 options: {
                     ...chartOptions,
                     plugins: {
                         ...chartOptions.plugins,
                         tooltip: {
                             ...chartOptions.plugins.tooltip,
                             callbacks: {
                                 title: (context) => context[0].label,
                                 label: (context) => context.parsed.y.toLocaleString() + ' ' + data.config.metricUnit
                             }
                         }
                     }
                 }
             });
         });
         
         // Navigation interactions
         document.querySelectorAll('.nav-link').forEach(link => {
             link.addEventListener('click', function(e) {
                 e.preventDefault();
                 
                 // Remove active class from all links
                 document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
                 // Add active class to clicked link
                 this.classList.add('active');
                 
                 // Smooth scroll to target
                 const targetId = this.getAttribute('href');
                 const targetElement = document.querySelector(targetId);
                 if (targetElement) {
                     targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                 }
             });
         });
         
         // Scroll spy for navigation
         const observerOptions = {
             rootMargin: '-20% 0px -35% 0px',
             threshold: 0
         };
         
         const observer = new IntersectionObserver((entries) => {
             entries.forEach(entry => {
                 if (entry.isIntersecting) {
                     const id = entry.target.getAttribute('id');
                     document.querySelectorAll('.nav-link').forEach(link => {
                         link.classList.remove('active');
                         if (link.getAttribute('href') === '#' + id) {
                             link.classList.add('active');
                         }
                     });
                 }
             });
         }, observerOptions);
         
         document.querySelectorAll('section[id]').forEach(section => {
             observer.observe(section);
         });
         
         // Enhanced animations
         const animateOnScroll = new IntersectionObserver((entries) => {
             entries.forEach(entry => {
                 if (entry.isIntersecting) {
                     entry.target.style.opacity = '1';
                     entry.target.style.transform = 'translateY(0)';
                 }
             });
         }, { threshold: 0.1 });
         
         document.querySelectorAll('.champion-card, .system-card, .test-card').forEach(el => {
             el.style.opacity = '0';
             el.style.transform = 'translateY(20px)';
             el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
             animateOnScroll.observe(el);
         });
         </script>`;
    }

    // ===== HELPER METHODS =====

    calculateTopPerformers(results) {
        const ioTests = results.filter(r => REPORT_CONFIG[r.test]?.category === 'I/O Performance');
        const processingTests = results.filter(r => REPORT_CONFIG[r.test]?.category === 'Data Processing');
        
        const fastestIO = ioTests.reduce((max, result) => 
            (result.metrics.operationsPerSecond || 0) > (max.value || 0) 
                ? { tech: result.tech, test: result.test, value: result.metrics.operationsPerSecond }
                : max
        , { value: 0 });
        
        const fastestProcessing = processingTests.reduce((max, result) => 
            (result.metrics.operationsPerSecond || 0) > (max.value || 0) 
                ? { tech: result.tech, test: result.test, value: result.metrics.operationsPerSecond }
                : max
        , { value: 0 });
        
        const mostEfficient = results.reduce((min, result) => 
            (result.metrics.maxMemoryMB || Infinity) < (min.value || Infinity) && result.metrics.maxMemoryMB > 0
                ? { tech: result.tech, test: result.test, value: result.metrics.maxMemoryMB }
                : min
        , { value: Infinity });
        
        return { fastestIO, fastestProcessing, mostEfficient };
    }

    aggregateAndCategorizeResults(results) {
        const categorized = {};
        
        results.forEach(result => {
            const config = REPORT_CONFIG[result.test];
            if (!config) return;
            
            const category = config.category;
            if (!categorized[category]) {
                categorized[category] = [];
            }
            categorized[category].push(result);
        });
        
        return categorized;
    }

    groupByTest(results) {
        return results.reduce((acc, result) => {
            if (!acc[result.test]) acc[result.test] = [];
            acc[result.test].push(result);
            return acc;
        }, {});
    }

    getCategoryDescription(category) {
        const descriptions = {
            'I/O Performance': 'Analysis of filesystem read and write operations, fundamental for applications handling file-based data.',
            'Data Processing': 'CPU-bound tasks involving data manipulation, serialization, and complex calculations in memory.',
            'Concurrency & Parallelism': 'Evaluation of how well each technology handles multiple concurrent tasks and parallel execution.',
            'Network Performance': 'Assessment of networking capabilities and resource efficiency under HTTP load.'
        };
        return descriptions[category] || '';
    }

    getTechIcon(tech) {
        const icons = {
            'go': '🐹',
            'node': '🟢', 
            'bun': '🥖',
            'python': '🐍',
            'rust': '🦀'
        };
        return icons[tech] || '💻';
    }

    slugify(text) {
        return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    }
}

// Execute the generator
if (require.main === module) {
    const generator = new ModernHTMLReportGenerator();
    generator.generateReport();
}

module.exports = ModernHTMLReportGenerator; 