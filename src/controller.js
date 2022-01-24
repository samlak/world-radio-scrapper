const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { continents } = require('./config');
const { 
  stringFormater,
  getMerger, 
  findRemainingCountries, 
  findRemainingRadioList 
} = require('./helper');


/**
 * CONTROLLER
 */

// Scrape the list of countries from continent data provided
const getCountriesList = async () => {
  continents.forEach((continent) => {
    let countriesList = [];

    // Make a fetch request to the continent URL
    fetch(continent.url)
    .then((res) => res.text()).then(async (data) => {
      console.log(`Scraping the list of countries in ${continent.name}`)
      // Extaracting the information needed from the page
      const $ = cheerio.load(data);
      const numbersOfCountries = $('ul.countries__countries-list > li').map(function (i, el) {
        return i;
      }).get();
      for(let occurence = 1; occurence <= numbersOfCountries.length; occurence++) {
        const countryName = $(`ul.countries__countries-list > li:nth-child(${occurence})`).text().trim();
        const countryUrl = $(`ul.countries__countries-list > li:nth-child(${occurence}) > a`).attr('href');
        const country = {
          name: countryName,
          url: `https://onlineradiobox.com${countryUrl}`
        }
        countriesList.push(country);
      }

      const fileLocation = path.join(__dirname, `./data/countries/${continent.slug}-countries.json`);
      await fs.writeFile(fileLocation, JSON.stringify(countriesList), () => 
        console.log(`Countries in ${continent.name} scrapped successfully`)
      );
    })
    .catch((error) => console.log('Error occured when scraping countries list.', error))
  })
}

// Merge all countries into a single file
const mergeCountriesList = async () => {
  let allCountries = [];
  continents.forEach((continent) => {
    const continentFilePath = path.join(__dirname, `./data/countries/${continent.slug}-countries.json`);
    const continentData = JSON.parse(fs.readFileSync(continentFilePath));
    console.log(`Merging all countries in ${continent.name}`);

    continentData.forEach((country) => {
      const formatedCountry = {
        ...country,
        name: stringFormater(country.name)
      };
      return allCountries.push(formatedCountry);
    });
  });

  const fileLocation = path.join(__dirname, `./data/merger/all-countries.json`);
  await fs.writeFile(fileLocation, JSON.stringify(allCountries), () => 
    console.log(`All countries merged successfully`)
  );

} 

// Scrape the list of radio station for each country
const getRadioList = async (option) => {
  // Checking the number of countries that has not been scrapped
  if(option && option === 'status'){
    const remainingCountries = await findRemainingCountries('radio-station-list', 'list');
    if (remainingCountries.length  > 0) {
      console.log(`There are ${remainingCountries.length} country(ies) radio list left to be scrapped.`);
      return ;
    }
    console.log(`All countries radio list has been scrapped.`);
    return ;
  }

  let listOfCountries = getMerger('countries');
  // Scrapping only countries that has not been scrapped when scraping is resumed
  if(option && option === 'resume'){
    listOfCountries = await findRemainingCountries('radio-station-list', 'list');
  }

  let countryIndex = 0; 
  while (countryIndex < listOfCountries.length) {

    let radioList = [];
    const countryName = listOfCountries[countryIndex].name;
    await fetch(listOfCountries[countryIndex].url)
    .then((res) => res.text()).then(async (data) => {
      console.log(`Scraping the list of radio station in ${countryName}`)
      const $ = cheerio.load(data);
      const findPagination = $('dl.pagination').length;
      
      const getRadioOnThePage = ($) => {
        const radios = [];
        const numOfRadiosOnThePage = $('li.stations__station').length;

        for (let index = 1; index <= numOfRadiosOnThePage; index++) {
          const radioUrl = $(`li.stations__station:nth-child(${index}) > figure > a`).attr('href');
          const radioCompleteUrl = `https://onlineradiobox.com${radioUrl}`;
          radios.push(radioCompleteUrl);
        }
        return radios;
      }

      radioList.push(...getRadioOnThePage($));
      
      // Scrapping radio list from other pages if the country radio list extend to other page
      if(findPagination) {
        let numOfPage = $('dl.pagination').children().last().prev().prev().text();

        let pageNum = 1;
        while ( pageNum < numOfPage ) {
          console.log(`Scraping page ${pageNum} of radio station in ${countryName}`)
          const pageUrl = `${listOfCountries[countryIndex].url}?p=${pageNum}`;

          await fetch(pageUrl)
          .then((res) => res.text()).then(async (data) => {
            const $ = cheerio.load(data);
            radioList.push(...getRadioOnThePage($))
          });

          pageNum++;
        }
        
      }

      const fileLocation = path.join(__dirname, `./data/radio-station-list/${countryName}-list.json`);
      await fs.writeFile(fileLocation, JSON.stringify(radioList), () => 
        console.log(`List of radio station in ${countryName} scrapped successfully`)
      );
    })
    .catch((error) => console.log('Error occured when scrapping radio list.', error));

    countryIndex++;
  }
}

// Merge all the radio list into a single file
const mergeRadioList = async () => {
  const allRadioList = [];
  const listOfCountries = getMerger('countries');
  listOfCountries.forEach((country) => {
    const countryFilePath = path.join(__dirname, `./data/radio-station-list/${country.name}-list.json`);
    const countryData = JSON.parse(fs.readFileSync(countryFilePath));
    console.log(`Merging radio list in ${country.name}`);

    const allRadioUrl = [];
    countryData.forEach((radioUrl) => {
      return allRadioUrl.push(radioUrl)
    });

    const formatedRadioList = {
      country: country.name,
      url: allRadioUrl,
    };

    return allRadioList.push(formatedRadioList);
  });

  const fileLocation = path.join(__dirname, `./data/merger/all-radio-station-list.json`);
  await fs.writeFile(fileLocation, JSON.stringify(allRadioList), () => 
    console.log(`Radio list in all countries merged successfully`)
  );

} 

// Scrape the informatio of each radio station
const getRadioInfo = async (option) => {
  // Checking the number of radio list that has not been scrapped
  if(option && option === 'status'){
    const remainingCountries = await findRemainingCountries('radio-station-info', 'info');
    if (remainingCountries.length  > 0) {
      console.log(`There are ${remainingCountries.length} country(ies) radio info left to be scrapped.`);
      return ;
    }
    console.log(`All countries radio info has been scrapped.`);
    return ;
  }

  let allRadioList = getMerger('radio-station-list');
  // Scrapping only radio list that has not been scrapped when scraping is resumed
  if(option && option === 'resume'){
    allRadioList = await findRemainingRadioList();
  }
  
  let radioListIndex = 0;
  while (radioListIndex < allRadioList.length) {
    const countryName = allRadioList[radioListIndex].country;
    console.log(`Scraping radio info for ${countryName}`)
    const radioInfo = [];
    let radioIndex = 0; 
    while (radioIndex < allRadioList[radioListIndex].url.length) {
      await fetch(allRadioList[radioListIndex].url[radioIndex])
      .then((res) => res.text()).then(async (data) => {
        console.log(`Scraping info for radio station ${radioIndex} in ${countryName}`)
        const $ = cheerio.load(data);
        
        const radioStream = $('button.station_play');
        const radioStreamType = radioStream.attr('streamtype');
        const radioName = radioStream.attr('radioname');
        const radioLogo = radioStream.attr('radioimg');
        const completeRadioLogoURL = `https:${radioLogo}`;
        const radioLocationInfo = $('ul.breadcrumbs');
        const radioLocation = radioLocationInfo.children().last().prev().text();
        const radioCountry= radioLocationInfo.children().first().text();
        const radioDescription = $('div.station__description').text();
        const radioWebsite = $('a.station__reference--web').attr('href');
        let radioStreamUrl = $('button.station_play').attr('stream');

        // Getting the originial URL if it is wrapped around onlineradiobox URL
        if(radioStreamUrl.includes('https://onlineradiobox.com/json/')){
          const redirectedUrl = await fetch(radioStreamUrl);
          radioStreamUrl = redirectedUrl.url;
        }

        const radio = {
          name: radioName,
          description: radioDescription,
          location: radioLocation,
          country: radioCountry,
          streamUrl: radioStreamUrl,
          streamType: radioStreamType,
          logo: completeRadioLogoURL,
          website: radioWebsite,
        }
        radioInfo.push(radio);
      })
      .catch((error) => console.log('Error occured when scrapping radio info.', error)); 
      
      radioIndex++;
    };

    const fileLocation = path.join(__dirname, `./data/radio-station-info/${countryName}-info.json`);
    await fs.writeFile(fileLocation, JSON.stringify(radioInfo), () => 
      console.log(`Info of radio station in ${countryName} scrapped successfully`)
    );

    radioListIndex++;
  };
}

// Merge all the radio information into a single file
const mergeRadioInfo = async () => {
  let allRadioInfo = [];
  const listOfCountries = getMerger('countries');
  listOfCountries.forEach((country) => {
    const radioInfoFilePath = path.join(__dirname, `./data/radio-station-info/${country.name}-info.json`);
    const radioInfoData = JSON.parse(fs.readFileSync(radioInfoFilePath));
    console.log(`Merging radio info in ${country.name}`);

    radioInfoData.forEach((radioInfo) => {
      return allRadioInfo.push(radioInfo)
    });
  });


  const fileLocation = path.join(__dirname, `./data/merger/all-radio-station-info.json`);
  await fs.writeFile(fileLocation, JSON.stringify(allRadioInfo), () => 
    console.log(`Radio info in all countries merged successfully`)
  );
} 

// Group the radio station by location and add their geocode
const groupRadioInfo = async () => {
  const radioInfoMergerFilePath= path.join(__dirname, `./data/merger/all-radio-station-info.json`);
  const radioInfoMergerData = JSON.parse(fs.readFileSync(radioInfoMergerFilePath));
  
  // Grouping the radio info by location
  const radioInfoByLocation = radioInfoMergerData.reduce(function (initial, current) {
    initial[current.location] = initial[current.location] || [];
    initial[current.location].push(current);
    return initial;
  }, {});

  const radioInfoWithGeocode = [];
  for (const [key, value] of Object.entries(radioInfoByLocation)) {
    console.log(`Getting the geocode of ${key}`)
    const encodedUrl = encodeURI(key);

    // Making a request to positionstack API to get the location Geocode
    await fetch(`https://positionstack.com/geo_api.php?query=${encodedUrl}`)
    .then(response => response.text())
    .then(data => {
      const dataInJson = JSON.parse(data);
      radioInfoWithGeocode.push({
        location: key,
        longitude: dataInJson.data[0].longitude,
        latitude: dataInJson.data[0].latitude,
        radio: value
      })
    })
    .catch((error) => console.log('Error occured when grouping radio info.', error));
  }

  const fileLocation = path.join(__dirname, `./data/merger/grouped-radio-station-info.json`);
  await fs.writeFile(fileLocation, JSON.stringify(radioInfoWithGeocode), () => 
    console.log(`Radio info grouped successfully`)
  );

}

module.exports = {
  getCountriesList,
  mergeCountriesList,
  getRadioList,
  mergeRadioList,
  getRadioInfo,
  mergeRadioInfo,
  groupRadioInfo
}