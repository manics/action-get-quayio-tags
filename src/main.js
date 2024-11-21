const core = require('@actions/core')
const { nextBuildNumber } = require('./buildNumbers')

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
async function run() {
  try {
    const repository = core.getInput('repository', { required: true })
    const version = core.getInput('version', { required: true })

    // Debug logs are only output if the `ACTIONS_STEP_DEBUG` secret is true
    core.debug(`Fetching build number for ${repository} version ${version}`)
    const buildNumber = await nextBuildNumber(repository, version)
    core.info(`Next buildNumber: ${buildNumber}`)
    core.setOutput('buildNumber', buildNumber)
  } catch (error) {
    // Fail the workflow run if an error occurs
    core.setFailed(error.message)
  }
}

module.exports = {
  run
}
