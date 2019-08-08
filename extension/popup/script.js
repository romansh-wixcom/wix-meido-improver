const button = document.getElementById('openOptions');
button.addEventListener('click', event => {
  event.preventDefault();
  browser.runtime.openOptionsPage();
});


let weekShift = 0;
let warningsCount = 0;

const errorElem = document.getElementById('error');
const warningElem = document.getElementById('warning');
const ordersElem = document.getElementById('orders');
const thisWeekElem = document.getElementById('this-week');
const theNextWeekElem = document.getElementById('the-next-week');
const updateDateElem = document.getElementsByClassName('updated-date')[0];
const notLoadedElem = document.getElementsByClassName('not-loaded')[0];
const prevWeekButtonElem = document.getElementsByClassName('prev-week')[0];
const nextWeekButtonElem = document.getElementsByClassName('next-week')[0];

(async () => {
  prevWeekButtonElem.addEventListener('click', () => changeWeekAndRender(weekShift - 1));
  nextWeekButtonElem.addEventListener('click', () => changeWeekAndRender(weekShift + 1));
  thisWeekElem.addEventListener('click', () => changeWeekAndRender(0));
  theNextWeekElem.addEventListener('click', () => changeWeekAndRender(1));


  subscribeForStorageChanges(() => render());
  await render();
})();


async function changeWeekAndRender(newWeekShift) {
  weekShift = newWeekShift;
  await render();
}

async function render() {
  renderWarning();
  const startDate = getDateByDayIndex(new Date(), 0);
  startDate.setDate(startDate.getDate() + (weekShift * 7));
  const {ordersPerDay, updatedDate, nextWeekOrdersPerDay} = await getWorkingWeekOrders(startDate);

  ordersElem.innerText = '';
  updateDateElem.innerText = '';
  notLoadedElem.style.display = updatedDate ? 'none' : 'block';
  thisWeekElem.classList.toggle('yes', weekShift === 0);
  theNextWeekElem.classList.toggle('yes', weekShift === 1);

  if (!updatedDate) {
    return;
  }

  updateDateElem.innerText = 'Updated: ' + new Date(updatedDate).toLocaleString();

  ordersPerDay.forEach((order, weekDayIndex) => {
    let date;
    if (order && order.date) {
      date = new Date(order.date);
    } else {
      date = startDate;
      date.setDate(date.getDate() + weekDayIndex);
    }

    const weekElem = createWeekElem(
      date,
      order && order.dishName,
      order && order.contractorName
    );
    weekElem.classList.toggle('today', isSameDay(date, new Date()));

    const nextWeekDay = getDateByDayIndex(new Date(), weekDayIndex);
    nextWeekDay.setDate(nextWeekDay.getDate() + 7);

    const repeatButton = weekElem.querySelector('.repeat');
    const hideRepeatButton = !order || !!nextWeekOrdersPerDay[weekDayIndex] || date >= nextWeekDay;
    repeatButton.disabled = hideRepeatButton;
    repeatButton.classList.toggle('hidden', hideRepeatButton);

    if (order && !hideRepeatButton) {
      if (isLoadingButton(weekDayIndex)) {
        startLoadingButton(weekDayIndex, repeatButton);
      }

      repeatButton.addEventListener('click', async () => {
        showWarning();
        startLoadingButton(weekDayIndex, repeatButton);
        hideError();

        try {
          await makeOrder(nextWeekDay, order.contractorName, order.dishId);
        } catch (error) {
          showError(error && error.message || 'Something went wrong...');
        }

        stopLoadingButton(weekDayIndex, repeatButton);
        hideWarning();
      });
    }

    const removeButton = weekElem.querySelector('.remove');
    const nextMonday = getDateByDayIndex(nextWeekDay, 0);
    const hideRemoveButton = !order || date < nextMonday;
    removeButton.disabled = hideRemoveButton;
    removeButton.classList.toggle('hidden', hideRemoveButton);

    if (order && !hideRemoveButton) {
      if (isRemovingButton(order.orderId)) {
        startRemovingButton(order.orderId, removeButton);
      }

      removeButton.addEventListener('click', async () => {
        showWarning();
        startRemovingButton(order.orderId, removeButton);
        hideError();

        try {
          await tryRemoveOrder(order.orderId, order.dishId);
        } catch (error) {
          showError(error && error.message || 'Something went wrong...');
        }

        stopRemovingButton(order.orderId, removeButton);
        hideWarning();
      });
    }


    ordersElem.appendChild(weekElem);
  });
}


function showError(errorMessage) {
  errorElem.innerText = errorMessage;
}

function hideError() {
  errorElem.innerText = '';
}

function showWarning() {
  warningsCount++;
  renderWarning();
}

function hideWarning() {
  warningsCount--;
  renderWarning();
}

function renderWarning() {
  warningElem.innerText = warningsCount === 0
    ? ''
    : "Do not close this popup";
}

function createWeekElem(date, dishName, contractorName) {
  const weekElem = document.createElement('div');
  weekElem.className = 'week';
  weekElem.innerHTML = `
    <div class="week__name">
      <div class="name">${escapeHtml(getWeekName(date))}</div>
      <div class="day">${escapeHtml(getDayName(date))}</div>
    </div>
    <div class="week__order">
      <div>
        <div class="order">${dishName ? escapeHtml(dishName) : '<i>No order</i>'}</div>
        <div class="contractor">${escapeHtml(contractorName || '')}</div>
      </div>
    </div>
    <div class="week__repeat">
      <button class="repeat">&nbsp;</button>
    </div>
    <div class="week__remove">
      <button class="remove">&nbsp;</button>
    </div>
  </div>
  `;
  return weekElem;
}


function getWeekName(date) {
  const dayIndex = getWeekDayIndex(date);
  return DAY_NAMES[dayIndex].substr(0, 3);
}

function getDayName(date) {
  const monthIndex = date.getMonth();
  const monthName = MONTH_NAMES[monthIndex].substr(0, 3);
  return date.getDate() + ' ' + monthName;
}
