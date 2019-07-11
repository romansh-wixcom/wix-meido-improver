const STORAGE_KEY = '__ITDXER_storage';

/**
 * User specific data
 *
 * @typedef {Object} UserData
 *
 * @property {boolean} filterRating
 * @property {boolean} filterOrdered
 * @property {boolean} filterFavorite
 * @property {boolean} filterVegan
 * @property {string} filterText
 * @property {Object} userRatings
 * @property {Object} avgRatings
 * @property {Object} favorites
 * @property {Object|null} orderedDishes
 */


/**
 * @return {Promise<UserData>}
 */
async function getData() {
  let data = null;

  try {
    const userDataItems = await browser.storage.local.get('userData');
    data = userDataItems.userData || JSON.parse(window.localStorage.getItem(STORAGE_KEY));
  } catch (error) {
    console.log(error);
  }

  return {
    filterRating: false,
    filterOrdered: false,
    filterFavorite: false,
    filterVegan: false,
    filterText: '',
    userRatings: {},
    avgRatings: {},
    favorites: {},
    orderedDishes: null,
    ...data,
  };
}

/**
 * @param {UserData} data
 * @return {Promise<void>}
 */
async function saveData(data) {
  await browser.storage.local.get({userData: data});
}

/**
 * @param {Function} fn
 * @return {Promise<void>}
 */
async function updateData(fn) {
  const prevData = await getData();
  await saveData({...prevData, ...fn(prevData)});
}

/**
 * @param {Function} handler
 */
function subscribeForStorageChanges(handler) {
  browser.storage.onChanged.addListener(async changes => {
    if (changes.userData) {
      const {newValue, oldValue} = changes.userData;
      handler(newValue, oldValue);
    }
  });
}
