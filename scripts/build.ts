import { execSync } from 'node:child_process'
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'

import { bold, cyan, dim, green, magenta, red, yellow } from 'ansis'

// File rename configuration
const RENAME_MAP = [{ from: 'cli.mjs', to: 'cli.js' }] as const

const EMPTY_EXPORT_NEWLINE_RE = /\nexport\s*\{\s*\}\s*(?:;\s*)?$/
const EMPTY_EXPORT_LINE_RE = /export\s*\{\s*\}\s*;?\n?$/m

const distDir = join(process.cwd(), 'dist')

/**
 * Rename a file in the dist directory
 */
function renameFile(from: string, to: string): boolean {
  const sourcePath = join(distDir, from)
  const targetPath = join(distDir, to)

  if (!existsSync(sourcePath)) {
    console.log(dim('  ℹ️  ') + yellow(from) + dim(' not found, skipping...'))
    return false
  }

  try {
    renameSync(sourcePath, targetPath)
    console.log(
      dim('  ') + green('🔁 Renamed ') + cyan(from) + dim(' → ') + magenta(to)
    )
    return true
  } catch (error) {
    console.error(
      dim('  ') +
        bold(red('❌ Failed to rename ')) +
        cyan(from) +
        red(': ') +
        red(formatError(error))
    )
    return false
  }
}

/**
 * Clean empty exports from a JavaScript file
 */
function cleanEmptyExports(fileName: string): boolean {
  const filePath = join(distDir, fileName)

  if (!existsSync(filePath)) {
    console.log(
      dim('  ℹ️  ') + yellow(fileName) + dim(' not found, skipping...')
    )
    return false
  }

  try {
    let content = readFileSync(filePath, 'utf-8')

    // Remove trailing "export { }"
    const originalContent = content
    content = content
      .replace(EMPTY_EXPORT_NEWLINE_RE, '')
      .replace(EMPTY_EXPORT_LINE_RE, '')
      .trimEnd()

    // Only write if content changed
    if (content !== originalContent) {
      writeFileSync(filePath, `${content}\n`, 'utf-8')
      console.log(dim('  ') + green('🧹 Cleaned ') + cyan(fileName))
      return true
    }

    console.log(dim('  ℹ️  ') + cyan(fileName) + dim(' already clean'))
    return false
  } catch (error) {
    console.error(
      dim('  ') +
        bold(red('❌ Failed to clean ')) +
        cyan(fileName) +
        red(': ') +
        red(formatError(error))
    )
    return false
  }
}

/**
 * Format error message for display
 */
function formatError(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error
  return JSON.stringify(error)
}

/**
 * Main build process
 */
function build() {
  try {
    console.log(bold(cyan('\n🚀 Starting build script...\n')))
    console.log(bold(yellow('📦 Running tsdown build...')))

    execSync('tsdown', { stdio: 'inherit' })

    console.log(bold(cyan('\n🔧 Post-build processing...\n')))

    // Step 1: Clean empty exports
    console.log(`${bold('Step 1: ')}Cleaning empty exports`)
    const cleaned = cleanEmptyExports('cli.mjs')
    if (cleaned) {
      console.log(green('  ✓ Cleaned successfully\n'))
    } else {
      console.log(dim('  ✓ No changes needed\n'))
    }

    // Step 2: Rename files
    console.log(`${bold('Step 2: ')}Renaming files`)
    let renamedCount = 0
    RENAME_MAP.forEach(({ from, to }) => {
      if (renameFile(from, to)) {
        renamedCount++
      }
    })
    if (renamedCount > 0) {
      console.log(green(`  ✓ Renamed ${renamedCount} file(s)\n`))
    } else {
      console.log(dim('  ✓ No files renamed\n'))
    }

    console.log(bold(green('🎉 Build completed successfully!\n')))
  } catch (error) {
    console.error(
      `${bold(red('\n❌ Build failed: ')) + red(formatError(error))}\n`
    )
    process.exit(1)
  }
}

build()
