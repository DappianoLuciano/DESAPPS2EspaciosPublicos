#!/bin/bash

# Script para testear el pipeline CI localmente antes de hacer push
# Simula los checks que correrán en GitHub Actions

set -e  # Salir si algún comando falla

echo "🚀 Testing CI Pipeline Locally"
echo "================================"
echo ""

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para imprimir con color
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "ℹ️  $1"
}

# Función para ejecutar comando y reportar resultado
run_check() {
    local check_name=$1
    shift
    echo ""
    echo "Running: $check_name"
    echo "---"
    if "$@"; then
        print_success "$check_name passed"
        return 0
    else
        print_error "$check_name failed"
        return 1
    fi
}

# Verificar que estamos en la raíz del proyecto
if [ ! -d "espacios-publicos-backend" ] || [ ! -d "espacios-publicos-frontend" ]; then
    print_error "Este script debe ejecutarse desde la raíz del proyecto"
    exit 1
fi

print_info "Iniciando tests del pipeline..."
echo ""

FAILED_CHECKS=0

# ========================================
# BACKEND CHECKS
# ========================================
echo "========================================"
echo "🔧 BACKEND CHECKS"
echo "========================================"

cd espacios-publicos-backend

# Install dependencies
if ! run_check "Backend: Install dependencies" npm ci; then
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

# Generate Prisma
if ! run_check "Backend: Generate Prisma Client" npm run prisma:generate; then
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

# Run tests
if ! run_check "Backend: Run tests" npm test; then
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

# Build
if ! run_check "Backend: Build" npm run build; then
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

# Check for build output
if [ -d "dist" ]; then
    print_success "Backend: Build artifacts created"
    echo "Build size: $(du -sh dist | cut -f1)"
else
    print_error "Backend: Build artifacts not found"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

cd ..

# ========================================
# FRONTEND CHECKS
# ========================================
echo ""
echo "========================================"
echo "🎨 FRONTEND CHECKS"
echo "========================================"

cd espacios-publicos-frontend

# Install dependencies
if ! run_check "Frontend: Install dependencies" npm ci; then
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

# Run linter
if ! run_check "Frontend: Run linter" npm run lint; then
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

# Build
if ! run_check "Frontend: Build" npm run build; then
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

# Check for build output
if [ -d "dist" ]; then
    print_success "Frontend: Build artifacts created"
    BUNDLE_SIZE=$(du -sh dist | cut -f1)
    echo "Build size: $BUNDLE_SIZE"

    # Warning si el bundle es muy grande (>10MB)
    BUNDLE_SIZE_MB=$(du -sm dist | cut -f1)
    if [ "$BUNDLE_SIZE_MB" -gt 10 ]; then
        print_warning "Frontend bundle size is large (${BUNDLE_SIZE_MB}MB). Consider optimization."
    fi
else
    print_error "Frontend: Build artifacts not found"
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
fi

cd ..

# ========================================
# ADDITIONAL CHECKS
# ========================================
echo ""
echo "========================================"
echo "🔍 ADDITIONAL CHECKS"
echo "========================================"

# Check for console.log
print_info "Checking for console.log in frontend source..."
if grep -r "console\.log" espacios-publicos-frontend/src/ --include="*.ts" --include="*.tsx" 2>/dev/null; then
    print_warning "Found console.log statements in frontend source code"
else
    print_success "No console.log found in frontend"
fi

# Check for TODO comments
print_info "Checking for TODO/FIXME comments..."
TODO_COUNT=$(grep -r "TODO\|FIXME\|XXX" . --include="*.ts" --include="*.tsx" --exclude-dir=node_modules --exclude-dir=dist 2>/dev/null | wc -l || echo "0")
if [ "$TODO_COUNT" -gt 0 ]; then
    print_warning "Found $TODO_COUNT TODO/FIXME comments"
else
    print_success "No TODO comments found"
fi

# Check for .env files
print_info "Checking for uncommitted .env files..."
if git ls-files | grep -E '^\.env$|^.*\.env\.local$'; then
    print_error "Found .env files in git! These should not be committed."
    FAILED_CHECKS=$((FAILED_CHECKS + 1))
else
    print_success "No .env files in repository"
fi

# Check for large files
print_info "Checking for large files (>1MB)..."
LARGE_FILES=$(find . -type f -size +1M ! -path "*/node_modules/*" ! -path "*/.git/*" ! -path "*/dist/*" 2>/dev/null || echo "")
if [ -n "$LARGE_FILES" ]; then
    print_warning "Found large files:"
    echo "$LARGE_FILES"
else
    print_success "No large files found"
fi

# ========================================
# SUMMARY
# ========================================
echo ""
echo "========================================"
echo "📊 TEST SUMMARY"
echo "========================================"
echo ""

if [ $FAILED_CHECKS -eq 0 ]; then
    print_success "All checks passed! ✨"
    print_info "You can safely push your changes"
    exit 0
else
    print_error "$FAILED_CHECKS check(s) failed"
    print_info "Please fix the issues before pushing"
    exit 1
fi
