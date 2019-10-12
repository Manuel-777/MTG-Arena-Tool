import { createDiv, queryElements as $$ } from 'common/dom-fns';

function createSelect(
  parent,
  options,
  current,
  callback,
  divClass,
  optionFormatter
) {
  let selectContainer = createDiv(["select_container", divClass]);
  selectContainer.id = divClass;
  if (!options.includes(current)) current = options[0];
  selectContainer.value = current;
  let currentDisplay = current;
  if (typeof optionFormatter === "function") {
    currentDisplay = optionFormatter(current);
  }
  let selectButton = createDiv(["select_button"], currentDisplay);
  let selectOptions = createDiv(["select_options_container"]);

  selectContainer.appendChild(selectButton);
  selectContainer.appendChild(selectOptions);

  selectButton.addEventListener("click", () => {
    if (!selectButton.classList.contains("active")) {
      current = selectContainer.value;

      selectButton.classList.add("active");
      selectOptions.style.display = "block";
      for (let i = 0; i < options.length; i++) {
        if (options[i] !== current) {
          let optionDisplay = options[i];
          if (typeof optionFormatter === "function") {
            optionDisplay = optionFormatter(optionDisplay);
          }

          let option = createDiv(["select_option"], optionDisplay);
          selectOptions.appendChild(option);

          option.addEventListener("click", () => {
            selectButton.classList.remove("active");
            selectButton.innerHTML = optionDisplay;
            selectContainer.value = options[i];
            selectOptions.style.display = "none";
            selectOptions.innerHTML = "";
            callback(options[i]);
          });
        }
      }
    } else {
      selectButton.classList.remove("active");
      selectOptions.innerHTML = "";
      selectOptions.style.display = "none";
    }
  });

  parent.appendChild(selectContainer);

  return selectContainer;
}

export { createSelect, selectAdd };
function selectAdd(selectElement, callback) {
  selectElement.classList.add("select-hidden");

  // dom structure is
  // container
  //   selectElement
  //   styledSelect
  //   list

  var container = createDiv(["select"]);
  wrap(selectElement, container);

  var styledSelect = createDiv(
    ["select-styled"],
    selectElement.options[0].textContent
  );
  container.appendChild(styledSelect);

  var list = document.createElement("ul");
  list.className = "select-options";
  container.appendChild(list);

  // insert list entries
  [...selectElement.options].forEach(option => {
    var li = document.createElement("li");
    li.innerHTML = option.textContent;
    li.rel = option.value;
    list.appendChild(li);
  });

  // Open and close the dropdown
  styledSelect.addEventListener("click", evt => {
    evt.stopPropagation();

    // toggle current select
    if (styledSelect.classList.contains("active")) {
      styledSelect.classList.remove("active");
    } else {
      styledSelect.classList.add("active");
    }

    // disable other selects on the page
    $$("div.select-styled")
      .filter(select => select !== styledSelect)
      .forEach(select => select.remove("active"));
  });

  // var listItems = list.childNodes;
  list.addEventListener("click", evt => {
    evt.stopPropagation();
    var option = evt.target;
    console.log("option", option, evt);

    styledSelect.innerHTML = option.textContent;
    styledSelect.classList.remove("active");

    selectElement.value = option.rel;

    callback(selectElement.value);
  });

  // hide the select if the document is clicked.
  document.addEventListener("click", () => {
    styledSelect.classList.remove("active");
  });
}

// several utility functions to replace useful jQuery methods
function wrap(element, wrapper) {
  element.parentNode.insertBefore(wrapper, element);
  wrapper.appendChild(element);
  return element;
}
