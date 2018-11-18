//BASIC DATA TYPE DESCRIPTION
const string = "<em>&lt;string&gt;</em>";
const date = "<em>&lt;date&gt;</em>";
const number = "<em>&lt;number&gt;</em>";
const boolean = "<em>&lt;boolean&gt;</em>";

const phoneOptions = id => {
  return [
    `<label>Phone format</label>
    <select class="form-control" name="format" id="phone_format[${id}]">
    <option value="###-###-####">###-###-####</option>
    <option value="(###) ###-####">(###) ###-####</option>
    <option value="### ### ####">### ### ####</option>
    <option value="+# ### ### ####">+# ### ### ####</option>
    <option value="+# (###) ###-####">+# (###) ###-####</option>
    <option value="+#-###-###-####">+#-###-###-####</option>
    <option value="#-(###)###-####">#-(###)###-####</option>
    <option value="##########">##########</option></select>`
  ];
};

const moneyOptions = id => {
  return [
    `<label>Min</label><input value="0" type="number" name="min" id="${id}_min_money" />`,
    `<label>Max</label><input value="10" type="text" name="max" id="${id}_max_money" /> `,
    `<label>Currency</label>
     <select class="form-control" name="symbol" id="${id}_money_symbol">
      <option value="$">$</option>
      <option value="£">£</option>
      <option value="€">€</option>
      <option value="¥">¥</option>
      <option value="random">random</option>
      <option value="none">none</option>
    </select>
  `
  ];
};

const charSeqOptions = id => {
  return [
    `<label class="tooltip">Format<div class="tooltiptext" style="width:300px;">
     <div>Creating character and digit sequences:</div>
     <br />
    <ul>
      <li>Use "#" for a random digit.</li>
      <li>Use "@" for a random lower case letter.</li>
      <li>Use "^" for a random upper case letter.</li>
      <li>Use "*" for a random digit or letter.</li>
      <li>Use "$" for a random digit or lower case letter.</li>
      <li>Use "%" for a random digit or upper case letter.</li>
      <li>Any other character will be included verbatim.</li>
    </ul>
    <div>Examples:</div>
    <br />
    <div>###-##-#### => 232-66-7439</div>
    <div>***-## => A0c-34</div>
    <div>^222-##:### => Cght-87:485</div></div></label>
    <input class="form-control" placeholder="ie: ###-@@@-####" spellcheck="false" type="text" name="format" id="${id}_character_sequence_format" />`
  ];
};

const dateOptions = id => {
  return [
    `<label>From</label><input class="form-control" value="01/01/2017" type="text" name="min" />`,
    `<label>To</label><input class="form-control" value="01/01/2018" type="text" name="max" />`,
    `<label>Response format</label>
    <select title="format" class="form-control" name="format" id="${id}_date_format">
    <optgroup label="date only">
      <option value="%-m/%-d/%Y">m/d/yyyy</option> <option value="%m/%d/%Y">mm/dd/yyyy</option>
      <option value="%Y-%m-%d">yyyy-mm-dd</option> <option value="%-d/%-m/%Y">d/m/yyyy</option>
      <option value="%d/%m/%Y">dd/mm/yyyy</option> <option value="%-d.%-m.%Y">d.m.yyyy</option>
      <option value="%d.%m.%Y">dd.mm.yyyy</option> <option value="%d-%b-%Y">dd-Mon-yyyy</option>
      <option value="%Y/%m/%d">yyyy/mm/dd</option>
    </optgroup>
    <optgroup label="date and time">
      <option value="%Y-%m-%d %H:%M:%S">SQL datetime</option> <option value="%Y-%m-%dT%H:%M:%SZ">ISO 8601 (UTC)</option>
      <option value="%s">epoch</option> <option value="mongo::epoch">mongoDB epoch</option>
      <option value="mongo::iso">mongoDB ISO</option>
    </optgroup>
    </select>`
  ];
};

const numberOptions = id => {
  return [
    `<label>Min</label><input maxlength="20" class="form-control" value="1" type="number" name="min" id="${id}_min" />`,
    `<label class="pad-left">Max</label><input maxlength="20" class="form-control" value="100" type="number" name="max" id="${id}_max" />`,
    `<label>Decimals</label><input maxlength="1" class="form-control " value="0" type="number" name="decimals" id="${id}_decimal_places" />`
  ];
};

const timeOptions = id => {
  return [
    `<label>From</label><input class="form-control" value="12:00 AM" type="text" name="min" id="${id}_min_time" />`,
    `<label>To</label><input class="form-control" value="11:59 PM" type="text" name="max" id="${id}_max_time" />`,
    `<label>Format</label>
     <select class="form-control" name="format" id="${id}time_format">
       <option value="%-l:%M %p">12 Hour</option>
       <option value="%-l:%M:%S %p">12 Hour w/seconds</option>
       <option value="%-l:%M:%S.%L %p">12 Hour w/millis</option>
       <option value="%-H:%M">24 Hour</option>
       <option value="%-H:%M:%S">24 Hour w/seconds</option>
       <option value="%-H:%M:%S.%L">24 Hour w/millis</option>
     </select>`
  ];
};

const wordsOptions = id => {
  return [
    `<label>At least</label> <input class="form-control" value="10" maxlength="3" type="text" name="min" id="${id}_words" />`,
    `<label>But no more than</label><input class="form-control" value="20" maxlength="3" type="text" name="max" id="${id}_words" />`
  ];
};

const fileNameOptions = id => {
  return [
    `<label>Type</label>
    <select class="form-control" name="types" id="${id}_file_type">
      <option value="all">all</option>
      <option selected="selected" value="common">common</option>
      <option value="code">code</option>
      <option value="document">document</option>
      <option value="image">image</option>
      <option value="media">media</option>
      <option value="text">text</option>
    </select>`,
    `<label>Format</label>
    <select class="form-control" name="format" id="${id}_file_name_format">
      <option value="camel-caps">FileName.xxx</option>
      <option value="camel">fileName.xxx</option>
      <option value="snake">file_name.xxx</option>
      <option value="random">random</option>
    </select>`
  ];
};

const nullOptions = (id, notnull) => {
  return `<label class="tooltip">Null %<span class="tooltiptext">Tip: Fields with the same null % will be null at the same time.</span></label>
  <input type="number" class="form-control" name="percentBlank" id="nullOption_${id}" value=0 min="0" max="100" ${
    notnull ? "disabled" : ""
  } />
  <small id="nullDescription_${id}">&nbsp;</small>`;
};

const mockSearchInput = id => {
  return `<label>Predefined types</label>
  <input type="text" name="type" class="biginput" id="autocomplete_${id}" required placeholder="Search..."/>
  <small id="mockDescription_${id}">&nbsp;</small>`;
};

/**
 * RETURNS AN ARRAY CONTAINING ALL POSSIBLE MOCK DATA TYPES
 */
const dataTypes = id => {
  let data = [
    // ------------------------------------------------------ADVANCED
    {
      value: "Character Sequence",
      data: {
        category: "Advanced",
        shortDesc: string,
        longDesc: "Simple sequence of characters",
        options: charSeqOptions(id)
      }
    },
    {
      value: "Naughty String",
      data: { category: "Advanced", shortDesc: string, longDesc: "Probability of causing issues", options: false }
    },

    // ------------------------------------------------------BASIC
    { value: "Boolean", data: { category: "Basic", shortDesc: boolean, longDesc: "true/false", options: false } },
    { value: "Color", data: { category: "Basic", shortDesc: string, longDesc: "Random color name", options: false } },
    {
      value: "Date",
      data: { category: "Basic", shortDesc: date, longDesc: "Random date value", options: dateOptions(id) }
    },
    {
      value: "GUID",
      data: { category: "Basic", shortDesc: string, longDesc: "Random 36-char hex GUID", options: false }
    },
    {
      value: "Hex Color",
      data: { category: "Basic", shortDesc: string, longDesc: "Random color hex string", options: false }
    },
    {
      value: "ISBN",
      data: { category: "Basic", shortDesc: string, longDesc: "Random ISBN-like string", options: false }
    },
    {
      value: "Number",
      data: { category: "Basic", shortDesc: number, longDesc: "Random number int/float", options: numberOptions(id) }
    },
    {
      value: "Password",
      data: { category: "Basic", shortDesc: string, longDesc: "Random 6-12 char string", options: false }
    },
    {
      value: "Row Number",
      data: { category: "Basic", shortDesc: number, longDesc: "Increment row number (1)", options: false }
    },
    {
      value: "Time",
      data: { category: "Basic", shortDesc: string, longDesc: "Random time value", options: timeOptions(id) }
    },
    {
      value: "Words",
      data: { category: "Basic", shortDesc: string, longDesc: "Random Lorem Ipsum words", options: wordsOptions(id) }
    },

    // ------------------------------------------------------CAR
    { value: "Car Make", data: { category: "Car", shortDesc: string, longDesc: "Random car make", options: false } },
    { value: "Car Model", data: { category: "Car", shortDesc: string, longDesc: "Random car model", options: false } },
    {
      value: "Car Model Year",
      data: { category: "Car", shortDesc: number, longDesc: "Random year of car model", options: false }
    },
    { value: "Car VIN", data: { category: "Car", shortDesc: string, longDesc: "Random VIN number", options: false } },

    // ------------------------------------------------------COMMERCE
    {
      value: "Bitcoin Address",
      data: { category: "Commerce", shortDesc: string, longDesc: "Random Bitcoin address", options: false }
    },
    {
      value: "Credit Card #",
      data: { category: "Commerce", shortDesc: number, longDesc: "Random credit card number", options: false }
    },
    {
      value: "Credit Card Type",
      data: { category: "Commerce", shortDesc: string, longDesc: "Random credit card type", options: false }
    },
    {
      value: "Currency",
      data: { category: "Commerce", shortDesc: string, longDesc: "Random currency name", options: false }
    },
    {
      value: "Currency Code",
      data: { category: "Commerce", shortDesc: string, longDesc: "Random currency code", options: false }
    },
    {
      value: "Department (Corporate)",
      data: { category: "Commerce", shortDesc: string, longDesc: "Random department name", options: false }
    },
    {
      value: "Department (Retail)",
      data: { category: "Commerce", shortDesc: string, longDesc: "Random department name", options: false }
    },
    {
      value: "Fake Company Name",
      data: { category: "Commerce", shortDesc: string, longDesc: "Random company name", options: false }
    },
    {
      value: "IBAN",
      data: { category: "Commerce", shortDesc: string, longDesc: "Random IBAN sequence", options: false }
    },
    {
      value: "Money",
      data: {
        category: "Commerce",
        shortDesc: string,
        longDesc: "Value w/wo currency symbol",
        options: moneyOptions(id)
      }
    },
    {
      value: "Product (Grocery)",
      data: { category: "Commerce", shortDesc: string, longDesc: "Random product name", options: false }
    },
    {
      value: "Stock Industry",
      data: { category: "Commerce", shortDesc: string, longDesc: "Random stock industry", options: false }
    },
    {
      value: "Stock Name",
      data: { category: "Commerce", shortDesc: string, longDesc: "Random stock name", options: false }
    },
    {
      value: "Stock Sector",
      data: { category: "Commerce", shortDesc: string, longDesc: "Random stock sector", options: false }
    },

    // ------------------------------------------------------IT
    {
      value: "App Name",
      data: { category: "IT", shortDesc: string, longDesc: "Random fake app name", options: false }
    },
    {
      value: "App Version",
      data: { category: "IT", shortDesc: string, longDesc: "Random 2-3 part numbers", options: false }
    },
    {
      value: "Domain Name",
      data: { category: "IT", shortDesc: string, longDesc: "Random web domain name", options: false }
    },
    {
      value: "Email Address",
      data: { category: "IT", shortDesc: string, longDesc: "Random email address", options: false }
    },
    {
      value: "File Name",
      data: { category: "IT", shortDesc: string, longDesc: "aaaaaaaa", options: fileNameOptions(id) }
    },
    {
      value: "IP Address v4 ",
      data: { category: "IT", shortDesc: string, longDesc: "Random IPv4 address", options: false }
    },
    {
      value: "IP Address v6",
      data: { category: "IT", shortDesc: string, longDesc: "Random IPv6 address", options: false }
    },
    {
      value: "MAC Address",
      data: { category: "IT", shortDesc: string, longDesc: "Random MAC address", options: false }
    },
    {
      value: "MD5 ",
      data: { category: "IT", shortDesc: string, longDesc: "Random hex encoded MD5 hash", options: false }
    },
    { value: "MIME Type", data: { category: "IT", shortDesc: string, longDesc: "Random MIME type", options: false } },
    {
      value: "SHA1",
      data: { category: "IT", shortDesc: string, longDesc: "Random hex encoded SHA1 hash", options: false }
    },
    {
      value: "SHA256",
      data: { category: "IT", shortDesc: string, longDesc: "Random hex encoded SHA256 hash", options: false }
    },
    { value: "Username", data: { category: "IT", shortDesc: string, longDesc: "Random username", options: false } },

    // ------------------------------------------------------LOCATION
    {
      value: "City",
      data: { category: "Location", shortDesc: string, longDesc: "Generates random city name", options: false }
    },
    {
      value: "Country",
      data: { category: "Location", shortDesc: string, longDesc: "Generates random country name", options: false }
    },
    {
      value: "Country Code",
      data: { category: "Location", shortDesc: string, longDesc: "Generates random country code", options: false }
    },
    {
      value: "Phone",
      data: {
        category: "Location",
        shortDesc: string,
        longDesc: "Generates random phone number",
        options: phoneOptions(id)
      }
    },
    {
      value: "Time Zone",
      data: { category: "Location", shortDesc: string, longDesc: "Generates random time zone", options: false }
    },

    // ------------------------------------------------------MOVIES
    {
      value: "Movie Genres",
      data: { category: "Movies", shortDesc: string, longDesc: "Random movie genre", options: false }
    },
    {
      value: "Movie Title",
      data: { category: "Movies", shortDesc: string, longDesc: "Random movie title", options: false }
    },

    // ------------------------------------------------------NATURE
    {
      value: "Animal Common Name",
      data: { category: "Nature", shortDesc: string, longDesc: "Random animal name", options: false }
    },
    {
      value: "Plant Common Name",
      data: { category: "Nature", shortDesc: string, longDesc: "Random plant name", options: false }
    },

    // ------------------------------------------------------PERSONAL
    {
      value: "First Name (Male)",
      data: { category: "Personal", shortDesc: string, longDesc: "Random male first name", options: false }
    },
    {
      value: "First Name (Female)",
      data: { category: "Personal", shortDesc: string, longDesc: "Random female first name", options: false }
    },
    {
      value: "Last Name",
      data: { category: "Personal", shortDesc: string, longDesc: "Random last name", options: false }
    },
    {
      value: "Full Name",
      data: { category: "Personal", shortDesc: string, longDesc: "Random M/F full name", options: false }
    },
    {
      value: "Gender",
      data: { category: "Personal", shortDesc: string, longDesc: "Random female/male value", options: false }
    },
    {
      value: "Gender (abbrev)",
      data: { category: "Personal", shortDesc: string, longDesc: "Random f/m value", options: false }
    },
    {
      value: "Job Title",
      data: { category: "Personal", shortDesc: string, longDesc: "Random job title", options: false }
    },
    {
      value: "Language",
      data: { category: "Personal", shortDesc: string, longDesc: "Random language name", options: false }
    },
    {
      value: "LinkedIn Skill",
      data: { category: "Personal", shortDesc: string, longDesc: "Random skill", options: false }
    },
    { value: "Race", data: { category: "Personal", shortDesc: string, longDesc: "Random race name", options: false } },
    {
      value: "University",
      data: { category: "Personal", shortDesc: string, longDesc: "Random university name", options: false }
    }
  ];
  return data;
};
