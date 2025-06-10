#!/usr/bin/env node

const { Command } = require('commander');
const inquirer = require('inquirer');
const chalk = require('chalk');
const CalVerGenerator = require('../lib/calver');
const GitOperations = require('../lib/git-operations');

const program = new Command();

program
  .name('calver-release')
  .description('Create CalVer release branches')
  .version('1.0.0');

program
  .command('create')
  .description('Create a new CalVer release branch')
  .option('-f, --format <format>', 'CalVer format', 'YYYY.MM.DD')
  .option('-b, --base-branch <branch>', 'Base branch to create from', 'main')
  .option('-p, --push', 'Push branch to remote after creation')
  .option('--dry-run', 'Show what would be created without actually creating')
  .option('--interactive', 'Interactive mode')
  .action(async (options) => {
    try {
      await createReleaseBranch(options);
    } catch (error) {
      console.error(chalk.red(`Error: ${error.message}`));
      process.exit(1);
    }
  });

program
  .command('formats')
  .description('List supported CalVer formats')
  .action(() => {
    console.log(chalk.blue('\nSupported CalVer formats:\n'));
    const formats = CalVerGenerator.getSupportedFormats();
    formats.forEach(format => {
      console.log(chalk.yellow(`  ${format.name.padEnd(12)}`), format.description);
      console.log(chalk.gray(`  ${' '.repeat(12)} Example: ${format.example}\n`));
    });
  });

async function createReleaseBranch(options) {
  const git = new GitOperations();
  
  // Check if we're in a git repository
  if (!(await git.isGitRepo())) {
    throw new Error('Not in a git repository');
  }

  // Get repository info
  const repoInfo = await git.getRepoInfo();
  console.log(chalk.blue(`Repository: ${repoInfo.currentBranch} branch`));
  
  if (!repoInfo.isClean) {
    console.log(chalk.yellow('⚠ Working directory has uncommitted changes'));
  }

  let config = options;

  // Interactive mode
  if (options.interactive) {
    config = await runInteractiveMode(options, git);
  }

  // Generate CalVer
  const calver = new CalVerGenerator({ format: config.format });
  const baseVersion = calver.generate();
  
  // Check for existing versions
  const existingTags = await git.getMatchingTags(new RegExp(`^v?${baseVersion.replace(/\./g, '\\.')}`));
  const existingBranches = await git.getMatchingBranches(new RegExp(`release.*${baseVersion.replace(/\./g, '\\.')}`));
  
  console.log(chalk.blue(`\nGenerated base version: ${baseVersion}`));
  
  if (existingTags.length > 0) {
    console.log(chalk.yellow(`Found existing tags: ${existingTags.join(', ')}`));
  }
  
  if (existingBranches.length > 0) {
    console.log(chalk.yellow(`Found existing branches: ${existingBranches.join(', ')}`));
  }

  // Generate final version (with increment if needed)
  const finalVersion = calver.generateIncremental(baseVersion, [
    ...existingTags.map(tag => tag.replace(/^v/, '')),
    ...existingBranches.map(branch => branch.replace(/^release\/v?/, ''))
  ]);

  const branchName = `release/v${finalVersion}`;
  
  console.log(chalk.green(`\nFinal version: ${finalVersion}`));
  console.log(chalk.green(`Branch name: ${branchName}`));

  // Check if branch already exists
  if (await git.branchExists(branchName)) {
    throw new Error(`Branch ${branchName} already exists locally`);
  }

  if (await git.remoteBranchExists(branchName)) {
    throw new Error(`Branch ${branchName} already exists on remote`);
  }

  if (options.dryRun) {
    console.log(chalk.cyan('\n🔍 DRY RUN - No changes will be made'));
    console.log(chalk.cyan(`Would create branch: ${branchName}`));
    console.log(chalk.cyan(`From base branch: ${config.baseBranch}`));
    if (config.push) {
      console.log(chalk.cyan(`Would push to remote: origin`));
    }
    return;
  }

  // Confirm creation
  if (!options.interactive) {
    const { confirm } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: `Create release branch ${branchName}?`,
        default: true
      }
    ]);

    if (!confirm) {
      console.log(chalk.yellow('Cancelled'));
      return;
    }
  }

  // Create the branch
  console.log(chalk.blue(`\nCreating release branch...`));
  await git.createBranch(branchName, config.baseBranch);

  // Push if requested
  if (config.push) {
    console.log(chalk.blue('Pushing to remote...'));
    await git.pushBranch(branchName);
  }

  console.log(chalk.green('\n✨ Release branch created successfully!'));
  console.log(chalk.gray(`\nNext steps:`));
  console.log(chalk.gray(`  1. Make your changes on this branch`));
  console.log(chalk.gray(`  2. Run your QA pipeline`));
  console.log(chalk.gray(`  3. Create a tag: git tag v${finalVersion}`));
  console.log(chalk.gray(`  4. Push tag: git push origin v${finalVersion}`));
}

async function runInteractiveMode(options, git) {
  const formats = CalVerGenerator.getSupportedFormats();
  
  const answers = await inquirer.prompt([
    {
      type: 'list',
      name: 'format',
      message: 'Select CalVer format:',
      choices: formats.map(f => ({
        name: `${f.name} - ${f.description}`,
        value: f.name
      })),
      default: options.format
    },
    {
      type: 'input',
      name: 'baseBranch',
      message: 'Base branch to create from:',
      default: options.baseBranch
    },
    {
      type: 'confirm',
      name: 'push',
      message: 'Push branch to remote after creation?',
      default: options.push || false
    }
  ]);

  return { ...options, ...answers };
}

program.parse();
