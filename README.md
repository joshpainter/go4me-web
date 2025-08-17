# go4.me Web Application

A responsive web application for the go4.me PFP collection with comprehensive mobile optimizations.

## Quick Start

1. **Environment Setup**

   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

2. **Install Dependencies**

   ```bash
   npm install
   ```

3. **Start Development Server**

   ```bash
   npm run dev
   ```

4. **Open Application**
   - Navigate to [http://localhost:3000](http://localhost:3000)

## Testing

### Prerequisites

- Node.js ≥22.0.0
- Docker (for Browserless service)
- Development server running on port 3000

### Test Setup

```bash
# Install test dependencies
npm run test:setup

# Start Browserless service (for visual testing)
docker compose up -d browserless
```

### Running Tests

#### Mobile Optimization Tests

```bash
# Run all mobile optimization tests
npm test

# Run mobile-specific tests only
npm run test:mobile

# Run visual regression tests
npm run test:visual
```

#### Test Categories

1. **Mobile Optimization Tests** (`tests/e2e/mobile-optimization.test.js`)
   - Validates mobile bottom bars on both pages
   - Tests responsive text sizing and layout
   - Verifies tab menu responsiveness
   - Checks logo and spacing optimizations

2. **Visual Regression Tests** (`tests/visual/cross-browser.test.js`)
   - Cross-browser compatibility testing
   - Screenshot comparison across devices
   - Visual validation of mobile improvements

### Test Configuration

Test settings are configured in `tests/config/test.config.js`:

- **Device Viewports**: iPhone SE, iPhone 15 Pro, iPad, Desktop sizes
- **Test URLs**: Home page and domain page scenarios
- **Screenshot Settings**: Full page captures with quality optimization
- **Timeout Settings**: Configurable timeouts for different operations

### Test Results

Tests automatically generate:

- **Screenshots**: Visual captures of each device/page combination
- **HTML Reports**: Comprehensive test results with visual comparisons
- **JSON Results**: Machine-readable test outcomes

Results are saved to:

- `tests/test-results/` - Screenshots and raw results
- `tests/reports/` - HTML reports for review

#### Viewing Reports
```bash
# Open latest HTML report in browser
./view-test-reports.sh

# Or manually open the latest report
open tests/reports/mobile-optimization-report-*.html
```

### Continuous Integration

The test suite is designed for CI/CD integration:

```bash
# Full test suite with reporting
npm test

# Exit codes:
# 0 - All tests passed
# 1 - Some tests failed
```

## Contributing

1. **Testing**: Run the full test suite before submitting changes
2. **Documentation**: Update README.md for significant changes

## License

MIT License - see LICENSE file for details.
