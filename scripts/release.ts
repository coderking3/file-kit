import { execSync } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import process from 'node:process'

import { bold, cyan, green, red, yellow } from 'ansis'

const CLI_VERSION_RE = /CLI_VERSION = '[^']+'/

const defaultConfigPath = join(process.cwd(), 'src/config/defaults.ts')
const packageJsonPath = join(process.cwd(), 'package.json')

// 解析命令行参数
interface ReleaseOptions {
  commitTag: boolean // commit + tag
  push: boolean // push to remote
}

function parseArgs(): ReleaseOptions {
  const args = process.argv.slice(2)

  return {
    commitTag: !args.includes('--no-commit-tag'), // 默认 true
    push: args.includes('--push') // 默认 false
  }
}

/* 
  Get package.json version
*/
async function getPackageVersion(): Promise<string> {
  const content = await readFile(packageJsonPath, 'utf-8')
  const pkg = JSON.parse(content)
  return pkg.version
}

/* 
  Update defaultConfigPath CLI_VERSION
*/
async function updateVersionConstants(version: string): Promise<void> {
  const constants = await readFile(defaultConfigPath, 'utf-8')
  const updated = constants.replace(
    CLI_VERSION_RE,
    `CLI_VERSION = '${version}'`
  )
  await writeFile(defaultConfigPath, updated, 'utf-8')
  console.log(`${green('✔')} Updated CLI_VERSION to ${version}`)
}

/* 
  Git commit and tag
*/
function gitCommitAndTag(version: string): void {
  console.log(bold(yellow('📝 Committing changes...\n')))
  execSync('git add package.json src/config/defaults.ts', { stdio: 'inherit' })
  execSync(`git commit -m "chore: release v${version}"`, { stdio: 'inherit' })
  console.log(`${green('✔')} Committed version ${version}`)

  console.log(bold(yellow('\n🏷️  Creating git tag...\n')))
  execSync(`git tag -a v${version} -m "Release v${version}"`, {
    stdio: 'inherit'
  })
  console.log(`${green('✔')} Created tag v${version}`)
}

/* 
  Git push commits and tags
*/
function gitPush(): void {
  console.log(bold(yellow('\n📤 Pushing to remote...')))
  execSync('git push', { stdio: 'inherit' })
  console.log(`${green('✔')} Pushed commits`)

  execSync('git push --tags', { stdio: 'inherit' })
  console.log(`${green('✔')} Pushed tags`)
}

/* 
  Main release process
*/
async function release(): Promise<void> {
  const options = parseArgs()

  try {
    console.log(bold(cyan('\n🚀 Starting release script...\n')))

    // Step 1: Bump version
    console.log(bold(yellow('📦 Bumping version...')))
    execSync('bumpp --no-commit --no-tag --no-push ', { stdio: 'inherit' })

    // Step 2: Update version constants
    console.log(bold(yellow('\n🔧 Updating version constants...\n')))
    const version = await getPackageVersion()
    await updateVersionConstants(version)
    console.log()

    // Step 3: Git commit + tag (默认启用)
    if (options.commitTag) {
      gitCommitAndTag(version)
    }

    // Step 4: Git push (默认禁用)
    if (options.push) {
      gitPush()
    }

    console.log(bold(green('\n🎉 Release completed successfully!\n')))
  } catch (error) {
    console.error(
      bold(red('\n❌ Release failed:')),
      (error as Error).message,
      '\n'
    )
    process.exit(1)
  }
}

release()
