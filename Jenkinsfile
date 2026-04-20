pipeline {
    agent {
        docker {
            image 'mcr.microsoft.com/playwright:v1.44.0-jammy'
            args  '--user root -v /tmp:/tmp'
        }
    }

    environment {
        NODE_ENV   = 'ci'
        CI         = 'true'
        BASE_URL   = "${env.API_BASE_URL ?: 'https://jsonplaceholder.typicode.com'}"
        REPORT_DIR = 'playwright-report'
        JUNIT_FILE = 'reports/junit-results.xml'
    }

    options {
        timestamps()
        timeout(time: 30, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '10'))
        disableConcurrentBuilds()
    }

    stages {
        // ── 1. Checkout ────────────────────────────────────────────────────
        stage('Checkout') {
            steps {
                checkout scm
                sh 'git log -1 --pretty=format:"%h %s (%an, %ar)" || echo "No git history"'
            }
        }

        // ── 2. Install ─────────────────────────────────────────────────────
        stage('Install') {
            steps {
                sh 'node --version && npm --version'
                sh 'npm ci'
            }
        }

        // ── 3. Lint & Type-check ───────────────────────────────────────────
        stage('Lint') {
            steps {
                sh 'npm run typecheck'
                sh 'npm run lint'
            }
        }

        // ── 4. Smoke Tests ─────────────────────────────────────────────────
        stage('Smoke Tests') {
            steps {
                sh '''
                    npx playwright test --project=smoke \
                        --reporter=list,junit
                '''
            }
            post {
                always {
                    junit allowEmptyResults: true, testResults: "${JUNIT_FILE}"
                }
            }
        }

        // ── 5. Sanity Tests ────────────────────────────────────────────────
        stage('Sanity Tests') {
            steps {
                sh '''
                    npx playwright test --project=sanity \
                        --reporter=list,junit
                '''
            }
            post {
                always {
                    junit allowEmptyResults: true, testResults: "${JUNIT_FILE}"
                }
            }
        }

        // ── 6. Integration Tests ───────────────────────────────────────────
        stage('Integration Tests') {
            steps {
                sh '''
                    npx playwright test --project=integration \
                        --reporter=list,junit
                '''
            }
            post {
                always {
                    junit allowEmptyResults: true, testResults: "${JUNIT_FILE}"
                }
            }
        }

        // ── 7. Regression Tests ────────────────────────────────────────────
        stage('Regression Tests') {
            steps {
                sh '''
                    ALLURE_RESULTS=true \
                    npx playwright test --project=regression \
                        --reporter=html,junit,allure-playwright
                '''
            }
            post {
                always {
                    junit allowEmptyResults: true, testResults: "${JUNIT_FILE}"
                }
            }
        }

        // ── 8. Generate Allure Report ──────────────────────────────────────
        stage('Report') {
            steps {
                sh 'npm run allure:report || true'
            }
        }

        // ── 9. Archive Artifacts ───────────────────────────────────────────
        stage('Archive') {
            steps {
                publishHTML(target: [
                    reportName           : 'Playwright Test Report',
                    reportDir            : "${REPORT_DIR}",
                    reportFiles          : 'index.html',
                    keepAll              : true,
                    allowMissing         : true,
                    alwaysLinkToLastBuild: true
                ])

                archiveArtifacts artifacts: [
                    "${REPORT_DIR}/**",
                    'allure-results/**',
                    'allure-report/**',
                    "${JUNIT_FILE}"
                ].join(', '),
                allowEmptyArchive: true,
                fingerprint: true
            }
        }
    }

    post {
        always {
            cleanWs()
        }
        success {
            echo "All tests passed. Report: ${BUILD_URL}Playwright_20Test_20Report/"
        }
        failure {
            echo "Tests FAILED. Check report at: ${BUILD_URL}Playwright_20Test_20Report/"
        }
    }
}
