chrome.runtime.onInstalled.addListener(() => {
  console.log('AI Web Archive installed');
});

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action === 'capturePage') {
    sendResponse({ status: 'ok' });
  }
});
