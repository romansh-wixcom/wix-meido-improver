subscribeForStorageChanges(data => saveFavorites(data.favorites));
fetchFavorites().then(favorites => {
  if (favorites) {
    updateData(() => ({favorites}));
  }
});


function getAuthCookie() {
  const reg = /(^|; )([a-z0-9]{32}=[^;]*)/;
  return document.cookie.match(reg)[2];
}

async function fetchFavorites() {
  return await doRequest('GET', '/favorites')
}

async function saveFavorites(favorites) {
  return await doRequest('POST', '/favorites', {favorites})
}

async function doRequest(method, endpoint, params) {
  const data = {...params, authCookie: getAuthCookie()};

  const isGetMethod = method.toUpperCase() === 'GET';
  const searchParams = new URLSearchParams(isGetMethod ? data : {}).toString();
  const body = isGetMethod ? null : JSON.stringify(data);

  const url = 'https://www.wix.com/_serverless/wix-meido-improver' + endpoint + '?' + searchParams;
  const response = await fetch(url, {method, body});

  const responseData = await response.json().catch(() => response.text());

  if (response.ok) {
    return responseData;
  } else {
    throw responseData;
  }
}