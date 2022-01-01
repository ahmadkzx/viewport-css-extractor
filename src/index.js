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
      await page.goto('https://google.com', { waitUntil: 'domcontentloaded', timeout: 20000 })
  
      const viewportBottom = 300

      let allCssString = ''
      const styleSheetUrls = await page.evaluate(() => {
        const styleSheets = Array.from(document.styleSheets).filter(sheet => !!sheet.href)

        return styleSheets.map(sheet => sheet.href)
      })

      await Promise.all(styleSheetUrls.map(url => axios.get(url))).then(res => {
        allCssString = res.map(res => res.data + ' ')
      })

      await page.evaluate((allCssString) => {
        const combinedStylesEl = document.createElement('style')
        combinedStylesEl.textContent = allCssString
        document.body.appendChild(combinedStylesEl)
      }, allCssString)
  
      const cssRules = await page.evaluate((viewportBottom) => {
        let output
        const styleSheets = Array.from(document.styleSheets)
        const styleSheet = styleSheets[0]
        const elements = Array.from(document.getElementsByTagName('*'))

        output = elements.map(el => {
          if (el.offsetTop < viewportBottom) {
            
            el.matches = el.matches || el.webkitMatchesSelector || el.mozMatchesSelector || el.msMatchesSelector || el.oMatchesSelector
            
            const rules = Array.from(styleSheet.cssRules)
            return rules.map(rule => {
              if (el.matches(rule.selectorText)) return rule.cssText
            }).filter(Boolean)
          }
        })
  
        return output
        
      }, viewportBottom)
      await browser.close()

      let combinedCssRules = cssRules.join(' ')
      resolve(combinedCssRules)

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