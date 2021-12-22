const puppeteer = require('puppeteer');

module.exports = function getViewportElementsClassList() {
  return new Promise(async (resolve, reject) => {
    try {
      const browser = await puppeteer.launch()
      const page = await browser.newPage()
      await page.goto('http://127.0.0.1:5500/src/test.html')

      const viewportBottom = 5000

      let classList = await page.evaluate((viewportBottom) => {
        const elements = [...document.getElementsByTagName('*')]

        return elements.map(el => {
          if (el.offsetTop < viewportBottom) return el.classList
        })
      }, viewportBottom)

      await browser.close()
      resolve(classList)

    } catch(err) {
      reject(err)
    }
  })
}