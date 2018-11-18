// populate table rows dynamically
function populateForm(data) {
  $.each(data.fields, function(index, item) {
    $(`<tr id="${index}">`)
      .append(
        $("<td>").html(
          `<label>${item.type}</label><input type="text" name="name" value="${item.name}" readonly/><small>${
            item.notnull ? "Null type: <b>NOT NULL</b>" : "Null type: <b>NULL</b>"
          }</small>`
        ),
        $("<td>").html(mockSearchInput(index)),
        $("<td>").html(
          `<div class="row row_options_${index}"><div class="column column_null_${index}">${nullOptions(
            index,
            item.notnull
          )}</div></div>`
        )
      )
      .appendTo("#myTable");
    initAutoComplete(index);
  });
  $("#subtitle").html(`Selected table: <b>${data.tableName}</b>`);
}

// check if valid data type selected
function validateForm() {
  let result = false;
  $.each($(".biginput"), function(idx, element) {
    result = checkForm($(element).val());
    if (!result) return false;
  });

  return result;
}

// check if valid data type selected
const checkForm = value => {
  let validValues = dataTypes("").map(obj => obj.value);
  return validValues.indexOf(value) > -1 ? true : false;
};

const parseForm = () => {
  let data = [];
  $("#mockForm tbody")
    .find("tr")
    .each(function() {
      // let id = $(this).attr("id"); // get row id
      let row = {};
      $(this)
        .find("input,select,textarea")
        .each(function() {
          if (isNaN($(this).val())) {
            row[$(this).attr("name")] = $(this).val();
          } else {
            row[$(this).attr("name")] = Number($(this).val());
          }
        });
      data.push(row);
    });
  return data;
};
