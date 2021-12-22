const getViewportElementsClassList = require('./utils/get-viewport-elements-class-list');

(async function() {
  const classList = await getViewportElementsClassList()

  console.log(classList)
})()