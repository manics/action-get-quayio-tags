const core = require('@actions/core')
const quayio = require('./quayio')

function _string2bool(s, varname = 'variable') {
  if (s === 'true') return true
  if (s === 'false') return false
  throw new Error(`${varname} must be 'true' or 'false': ${s}`)
}

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
async function run() {
  // Debug logs are only output if the `ACTIONS_STEP_DEBUG` secret is true
  try {
    const repository = core.getInput('repository', { required: true })
    const version = core.getInput('version', { required: true })
    const strictStr = core.getInput('strict', { required: true })
    const allTagsStr = core.getInput('allTags', { required: true })

    const strict = _string2bool(strictStr, 'strict')
    const allTags = _string2bool(allTagsStr, 'allTags')

    core.debug(
      `Fetching build number for ${repository} version=${version} strict=${strict} allTags=${allTags}`
    )
    const tags = await quayio.getAllMatches(
      repository,
      allTags ? '' : version,
      strict
    )
    const buildNumber = quayio.nextBuildNumber(version, tags)
    core.info(`Next buildNumber: ${buildNumber}`)
    core.setOutput('tags', tags)
    core.exportVariable('GET_QUAYIO_TAGS_TAGS', tags)
    core.setOutput('buildNumber', buildNumber)
    core.exportVariable('GET_QUAYIO_TAGS_BUILDNUMBER', buildNumber)
  } catch (error) {
    // Fail the workflow run if an error occurs
    core.setFailed(error.message)
  }
}

module.exports = {
  run
}
