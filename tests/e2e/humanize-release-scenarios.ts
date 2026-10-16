import type { Page } from 'playwright';

// These self-contained functions run inside the installed upstream MCP process.
export async function verifyHumanizedReads(page: Page) {
  const selector = '#rich';
  const attribute = 'data-note';
  const locator = page.locator(selector);
  const frame = page.frames().find((candidate) => candidate.parentFrame());
  if (!frame) throw new Error('Missing humanize fixture frame');
  const element = await locator.elementHandle();
  const input = await page.locator('#read-input').elementHandle();
  const hidden = await page.locator('#hidden-read').elementHandle();
  const overlapping = await page.locator('#overlapping-read').elementHandle();
  if (!element || !input || !hidden || !overlapping) throw new Error('Missing fixture handle');
  try {
    const pageReads = {
      value: await page.inputValue('#read-input'),
      text: await page.textContent(selector),
      innerText: await page.innerText(selector),
      html: await page.innerHTML(selector),
      attribute: await page.getAttribute(selector, attribute),
    };
    const locatorReads = {
      value: await page.locator('#read-input').inputValue(),
      text: await locator.textContent(),
      innerText: await locator.innerText(),
      html: await locator.innerHTML(),
      attribute: await locator.getAttribute(attribute),
      missingAttribute: await locator.getAttribute('data-absent'),
    };
    const frameReads = {
      value: await frame.inputValue('#frame-input'),
      text: await frame.textContent('button'),
      innerText: await frame.innerText('button'),
      html: await frame.innerHTML('button'),
      missingAttribute: await frame.getAttribute('button', 'data-absent'),
    };
    const handleReads = {
      value: await input.inputValue(),
      text: await element.textContent(),
      innerText: await element.innerText(),
      html: await element.innerHTML(),
      attribute: await element.getAttribute(attribute),
    };
    const fallbackReads = {
      text: await hidden.textContent(),
      html: await hidden.innerHTML(),
      attribute: await hidden.getAttribute(attribute),
      overlappingText: await overlapping.textContent(),
      overlappingAttribute: await overlapping.getAttribute(attribute),
    };
    await page.dispatchEvent('#dispatch', 'click');
    await page.locator('#dispatch').dispatchEvent('click');
    await element.dispatchEvent('click');
    await frame.dispatchEvent('button', 'click');
    await hidden.dispatchEvent('click');
    await overlapping.dispatchEvent('click');
    const transferExpression = `(() => {
      const data = new DataTransfer();
      data.setData('text/plain', 'Handle payload');
      return data;
    })()`;
    const transfer = await page.evaluateHandle(transferExpression);
    try {
      const eventInit = { dataTransfer: transfer };
      await page.locator('#dispatch').dispatchEvent('drop', eventInit);
    } finally {
      await transfer.dispose();
    }
    const dispatched = {
      clicks: await page.getAttribute('#dispatch', 'data-clicks'),
      visibleHandle: await element.getAttribute('data-clicks'),
      frame: await frame.innerText('button'),
      hidden: await hidden.getAttribute('data-clicks'),
      overlapping: await overlapping.getAttribute('data-clicks'),
      payload: await page.locator('#result').textContent(),
    };
    const lateElementExpression = `(() => {
      setTimeout(() => {
        const element = document.createElement('span');
        element.id = 'late-read';
        element.textContent = 'Late marker';
        document.body.append(element);
      }, 80);
    })()`;
    await page.evaluate(lateElementExpression);
    const options = { timeout: 5000 };
    const lateRead = await page.locator('#late-read').textContent(options);
    return { pageReads, locatorReads, frameReads, handleReads, fallbackReads, dispatched, lateRead };
  } finally {
    const disposals = [element.dispose(), input.dispose(), hidden.dispose(), overlapping.dispose()];
    await Promise.all(disposals);
  }
}

export async function verifyHumanizedSelections(page: Page) {
  const options = { timeout: 15000 };
  const longChoice = page.locator('#long-choice');
  const last = await longChoice.selectOption('199', options);
  const lastValue = await longChoice.inputValue();
  const repeated = await longChoice.selectOption('75', options);
  const repeatedValue = await longChoice.inputValue();
  const accented = await page.locator('#edge-choice').selectOption('accented', options);
  const duplicate = await page.locator('#edge-choice').selectOption('duplicate-first', options);
  const edgeValue = await page.locator('#edge-choice').inputValue();
  return { last, lastValue, repeated, repeatedValue, accented, duplicate, edgeValue };
}
