const path = require('path');
const axios = require('axios');
const fs = require('fs').promises;
const puppeteer = require('puppeteer');

(async function() {
  try {
    const test = await getViewportCss('https://test.com', 200)
    createCssFile(test)

  } catch(err) {
    console.error(err)
  }
})()

/**
 * extract viewport elements and their styles in string type
 * @returns {Promise}
 */
function getViewportCss(url, viewportBottom = 1600) {
  return new Promise(async (resolve, reject) => {
    try {
      /**
       * open virtual browser (chromium)
       */
      console.log('ℹ️ Loading Page...')
      const browser = await puppeteer.launch()
      const page = await browser.newPage()
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 50000 })
      console.log('✅ Page Loaded')

      /**
       * download all css files with axios
       * merge them into one string
       */
      console.log('\nℹ️ Downloading All CSS Files...')
      let allCssString = ''
      const styleSheetUrls = await page.evaluate(() => {
        const styleSheets = Array.from(document.styleSheets).filter(sheet => !!sheet.href)

        return styleSheets.map(sheet => sheet.href)
      })

      await Promise.all(styleSheetUrls.map(url => axios.get(url))).then(res => {
        allCssString = res.map(res => res.data + ' ')
      })
      console.log('✅ All CSS Files Downloaded')


      /**
       * get viewport elements
       * create new stylesheet using merged css string
       * extract viewport css
       * @returns {string} - viewport css string
       */
      console.log('\nℹ️ Extracting Viewport CSS String...')
      const viewportCssString = await page.evaluate((allCssString, viewportBottom) => {
        let output = ''

        const elements = Array.from(document.getElementsByTagName('*'))
        const viewportElements = elements.filter(el => {
          const offsetTop = window.scrollY + el.getBoundingClientRect().top
          return offsetTop <= viewportBottom
        })

        const styleSheet = new CSSStyleSheet()
        styleSheet.replaceSync(allCssString)

        const allCssRules = Array.from(styleSheet.cssRules)

        viewportElements.map(el => {
          allCssRules.map(rule => {
            if (el.matches(rule.selectorText)) output = `${output} ${rule.cssText}`
          })
        })
  
        return output

      }, allCssString, viewportBottom)
      console.log('✅ Viewport CSS String Extracted\n')

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