(function () {
  "use strict";

  var PRICES = {
    roomPerNight: 120,
    extraGuestPerNight: 30,
    packages: {
      restore: { base: 250, includedGuests: 2, extraGuest: 40 },
      morning: { base: 335, includedGuests: 2, extraGuest: 40 },
      active: { base: 175, includedGuests: 1, extraGuest: 50 },
    },
    extras: {
      spa: 15,
      restaurant: 35,
      quad: 55,
      canoe: 45,
      bike: 30,
    },
  };

  var form = document.getElementById("calculator-form");
  if (!form) {
    return;
  }

  var totalOutput = document.getElementById("calc-total");
  var breakdownList = document.getElementById("calc-breakdown");
  var packageField = document.getElementById("calc-package-field");
  var nightsField = document.getElementById("calc-nights-field");
  var spaHoursField = document.getElementById("calc-spa-hours-field");

  function getMode() {
    var checked = form.querySelector('input[name="mode"]:checked');
    return checked ? checked.value : "room";
  }

  function getNumber(name, fallback) {
    var field = form.elements[name];
    if (!field) {
      return fallback;
    }
    var value = Number(field.value);
    return Number.isFinite(value) ? value : fallback;
  }

  function isExtraEnabled(name) {
    var field = form.elements[name];
    return field && field.checked;
  }

  function toggleFields() {
    var isPackage = getMode() === "package";

    if (packageField) {
      packageField.hidden = !isPackage;
    }

    if (nightsField) {
      nightsField.hidden = isPackage;
    }

    if (spaHoursField) {
      spaHoursField.hidden = !isExtraEnabled("extra-spa");
    }
  }

  function formatMoney(value) {
    return Math.round(value) + " руб.";
  }

  function calculate() {
    var mode = getMode();
    var guests = Math.max(1, getNumber("guests", 1));
    var lines = [];
    var total = 0;

    if (mode === "package") {
      var packageKey = form.elements.package.value;
      var pack = PRICES.packages[packageKey] || PRICES.packages.restore;

      total += pack.base;
      lines.push("Пакет: " + formatMoney(pack.base));

      if (guests > pack.includedGuests) {
        var extraGuestsCost = (guests - pack.includedGuests) * pack.extraGuest;
        total += extraGuestsCost;
        lines.push(
          "Доп. гости (" +
            (guests - pack.includedGuests) +
            "): " +
            formatMoney(extraGuestsCost),
        );
      }
    } else {
      var nights = Math.max(1, getNumber("nights", 1));
      var roomCost = nights * PRICES.roomPerNight;
      total += roomCost;
      lines.push("Проживание (" + nights + " н.): " + formatMoney(roomCost));

      if (guests > 2) {
        var guestCost = (guests - 2) * PRICES.extraGuestPerNight * nights;
        total += guestCost;
        lines.push("Доп. гости: " + formatMoney(guestCost));
      }
    }

    if (isExtraEnabled("extra-spa")) {
      var hours = Math.max(1, getNumber("spa-hours", 3));
      var spaCost = hours * PRICES.extras.spa * guests;
      total += spaCost;
      lines.push("Спа (" + hours + " ч.): " + formatMoney(spaCost));
    }

    if (isExtraEnabled("extra-restaurant")) {
      var restaurantCost = PRICES.extras.restaurant * guests;
      total += restaurantCost;
      lines.push("Ресторан: " + formatMoney(restaurantCost));
    }

    if (isExtraEnabled("extra-quad")) {
      var quadCost = PRICES.extras.quad * guests;
      total += quadCost;
      lines.push("Квадроциклы: " + formatMoney(quadCost));
    }

    if (isExtraEnabled("extra-canoe")) {
      var canoeCost = PRICES.extras.canoe * guests;
      total += canoeCost;
      lines.push("Каноэ: " + formatMoney(canoeCost));
    }

    if (isExtraEnabled("extra-bike")) {
      var bikeCost = PRICES.extras.bike * guests;
      total += bikeCost;
      lines.push("Веломаршрут: " + formatMoney(bikeCost));
    }

    if (totalOutput) {
      totalOutput.textContent = formatMoney(total);
    }

    if (breakdownList) {
      breakdownList.innerHTML = "";

      if (lines.length === 0) {
        var emptyItem = document.createElement("li");
        emptyItem.textContent = "Выберите параметры для расчёта";
        breakdownList.appendChild(emptyItem);
        return;
      }

      lines.forEach(function (line) {
        var item = document.createElement("li");
        item.textContent = line;
        breakdownList.appendChild(item);
      });
    }
  }

  form.addEventListener("input", function () {
    toggleFields();
    calculate();
  });

  form.addEventListener("change", function () {
    toggleFields();
    calculate();
  });

  toggleFields();
  calculate();
})();
