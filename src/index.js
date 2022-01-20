const puppeteer = require('puppeteer');
const argv = require('yargs').argv;
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { continents } = require('./config');

const stringFormater = (str) => {
  let result = str.toLowerCase();
  result = result.replace(/\s/gi, '-');
  result = result.replace(/[^0-9a-z-]/g, '');
  return result;
}

const listOfAllCountries = () => {
  const allCountriesFilePath = path.join(__dirname, `./data/merger/all-countries.json`);
  return JSON.parse(fs.readFileSync(allCountriesFilePath));
}

const findRemainingCountries = async (folderName, fileEnding) => {
  const folderPath = path.join(__dirname, `./data/${folderName}`);
  const filesInFolder = await fs.readdirSync(folderPath);
  const fileNames = [];
  filesInFolder.forEach(function (file) {
    const fileName = file.substring(0, file.indexOf(`-${fileEnding}.json`));
    fileNames.push(fileName);
  });

  const allCountriesData = listOfAllCountries();
  const remainingCountries = allCountriesData.filter(country => !fileNames.includes(country.name));
  return remainingCountries;
}

const getCountriesList = async () => {
  continents.forEach((continent) => {
    let countriesList = [];
    fetch(continent.url)
    .then((res) => res.text()).then(async (data) => {
      console.log(`Scraping the list of countries in ${continent.name}`)
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

const getRadioList = async (option) => {
  if(option && option === 'status'){
    const remainingCountries = await findRemainingCountries('radio-station-list', 'list');
    if (remainingCountries.length  > 0) {
      console.log(`There are ${remainingCountries.length} country(ies) radio list left to be scrapped.`);
      return ;
    }
    console.log(`All countries radio list has been scrapped.`);
    return ;
  }

  let listOfCountries = await listOfAllCountries();
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

const getRadioInfo = async () => {
  let radioList = [
    "https://onlineradiobox.com/sn/zikfm/",
    "https://onlineradiobox.com/sn/sudfm/",
  ];

  const radioInfo = [];

  let radioIndex = 0; 
  while (radioIndex < radioList.length) {
    await fetch(radioList[radioIndex])
    .then((res) => res.text()).then(async (data) => {
      console.log(`Scraping info of  `)
      const $ = cheerio.load(data);
      
      const radioStream = $('button.station_play');
      const radioStreamUrl = radioStream.attr('stream');
      const radioStreamType = radioStream.attr('streamtype');
      const radioName = radioStream.attr('radioname');
      const radioLogo = radioStream.attr('radioimg');
      const completeRadioLogoURL = `https:${radioLogo}`;
      const radioLocationInfo = $('ul.breadcrumbs');
      const radioLocation = radioLocationInfo.children().last().prev().text();
      const radioCountry= radioLocationInfo.children().first().text();
      const radioDescription = $('div.station__description').text();
      const radioWebsite = $('a.station__reference--web').attr('href');

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
    .catch((error) => console.log('Error occured when scrapping radio list.', error)); 
    
    radioIndex++;
  };
  // console.log(radioInfo)

  const fileLocation = path.join(__dirname, `./data/radio-station-info/info.json`);
  await fs.writeFile(fileLocation, JSON.stringify(radioInfo), () => 
    console.log(`Countries in  scrapped successfully`)
  );
}

const resume = async () => {
  const re = await findRemainingCountries('radio-station-info', 'info');
  console.log(re);
}


// https://positionstack.com/geo_api.php?query=new%20york

(async () => {
  if( argv._[0] === "getCountriesList" ){
    return await getCountriesList();
  } else if ( argv._[0] === "mergeCountriesList" ){
    return await mergeCountriesList();
  } else if ( argv._[0] === "getRadioList" ){
    if ( argv._[1] === "resume" ){
      return await getRadioList("resume");
    } else if ( argv._[1] === "status" ){
      return await getRadioList("status");
    }
    return await getRadioList();
  } else if ( argv._[0] === "getRadioInfo" ){
    return await getRadioInfo();
  }
})();