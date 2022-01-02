const path = require('path');
const axios = require('axios');
const fs = require('fs').promises;
const puppeteer = require('puppeteer');

(async function() {
  try {
    const viewportCssRules = await getViewportCss()
    await createCssFile(viewportCssRules)

  } catch(err) {
    console.error(err)
  }
})()

/**
 * extract viewport elements and their styles in string type
 * @returns {Promise}
 */
function getViewportCss() {
  return new Promise(async (resolve, reject) => {
    try {
      const browser = await puppeteer.launch()
      const page = await browser.newPage()
      await page.goto('http://127.0.0.1:5500/mock/index.html', { waitUntil: 'domcontentloaded', timeout: 20000 })
  
      const viewportBottom = 3000

      let allCssString = ''
      const styleSheetUrls = await page.evaluate(() => {
        const styleSheets = Array.from(document.styleSheets).filter(sheet => !!sheet.href)

        return styleSheets.map(sheet => sheet.href)
      })

      await Promise.all(styleSheetUrls.map(url => axios.get(url))).then(res => {
        allCssString = res.map(res => res.data + ' ')
      })

      const viewportCssString = await page.evaluate((allCssString, viewportBottom) => {
        let output = ''

        const elements = Array.from(document.getElementsByTagName('*'))
        const viewportElements = elements.filter(el => el.offsetTop <= viewportBottom)

        const styleSheet = new CSSStyleSheet()
        styleSheet.replaceSync(allCssString)

        const allCssRules = Array.from(styleSheet.cssRules)

        viewportElements.map(el => {
          el.matches = el.matches || el.webkitMatchesSelector || el.mozMatchesSelector || el.msMatchesSelector || el.oMatchesSelector

          allCssRules.map(rule => {
            if (el.matches(rule.selectorText)) output = `${output} ${rule.cssText}`
          })
        })
  
        return output

      }, allCssString, viewportBottom)

      await browser.close()

      resolve(viewportCssString)

    } catch(err) {
      reject(err)
    }
  })
}

function createCssFile(css) {
  return new Promise(async (resolve, reject) => {
    try {
      const outPath = path.join(__dirname, '/dist.css')
      await fs.writeFile(outPath, css)
      resolve()
      
    } catch(err) {
      reject(err)
    }
  })
}