const simpleGit = require('simple-git');
const chalk = require('chalk');

class GitOperations {
  constructor(workingDir = process.cwd()) {
    this.git = simpleGit(workingDir);
  }

  /**
   * Check if we're in a git repository
   */
  async isGitRepo() {
    try {
      await this.git.status();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get current branch name
   */
  async getCurrentBranch() {
    const status = await this.git.status();
    return status.current;
  }

  /**
   * Check if branch exists locally
   */
  async branchExists(branchName) {
    try {
      const branches = await this.git.branchLocal();
      return branches.all.includes(branchName);
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if branch exists remotely
   */
  async remoteBranchExists(branchName, remote = 'origin') {
    try {
      const branches = await this.git.branch(['-r']);
      return branches.all.some(branch => branch.includes(`${remote}/${branchName}`));
    } catch (error) {
      return false;
    }
  }

  /**
   * Get existing tags that match pattern
   */
  async getMatchingTags(pattern) {
    try {
      const tags = await this.git.tags();
      return tags.all.filter(tag => tag.match(pattern));
    } catch (error) {
      return [];
    }
  }

  /**
   * Get existing branches that match pattern
   */
  async getMatchingBranches(pattern) {
    try {
      const branches = await this.git.branchLocal();
      return branches.all.filter(branch => branch.match(pattern));
    } catch (error) {
      return [];
    }
  }

  /**
   * Create and checkout new branch
   */
  async createBranch(branchName, fromBranch = null) {
    if (fromBranch) {
      await this.git.checkout(fromBranch);
      await this.git.pull();
    }
    
    await this.git.checkoutLocalBranch(branchName);
    console.log(chalk.green(`✓ Created and switched to branch: ${branchName}`));
  }

  /**
   * Push branch to remote
   */
  async pushBranch(branchName, remote = 'origin') {
    await this.git.push(['-u', remote, branchName]);
    console.log(chalk.green(`✓ Pushed branch to ${remote}/${branchName}`));
  }

  /**
   * Check if working directory is clean
   */
  async isClean() {
    const status = await this.git.status();
    return status.files.length === 0;
  }

  /**
   * Get repository info
   */
  async getRepoInfo() {
    try {
      const remotes = await this.git.getRemotes(true);
      const origin = remotes.find(r => r.name === 'origin');
      const status = await this.git.status();
      
      return {
        currentBranch: status.current,
        isClean: status.files.length === 0,
        remoteUrl: origin ? origin.refs.fetch : null,
        ahead: status.ahead,
        behind: status.behind
      };
    } catch (error) {
      throw new Error(`Failed to get repository info: ${error.message}`);
    }
  }
}

module.exports = GitOperations;
