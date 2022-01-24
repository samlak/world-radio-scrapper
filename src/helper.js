const fs = require('fs');
const path = require('path');

/**
 * 
 * HELPER FUNCTION
 */

// Remove space and replace with hypen
const stringFormater = (str) => {
  let result = str.toLowerCase();
  result = result.replace(/\s/gi, '-');
  result = result.replace(/[^0-9a-z-]/g, '');
  return result;
}

// Get the JSON of all the mergered data
const getMerger = (name) => {
  const allCountriesFilePath = path.join(__dirname, `./data/merger/all-${name}.json`);
  return JSON.parse(fs.readFileSync(allCountriesFilePath));
}

const findEmptyRadioStation = (fileNames, fileEnding) => {
  const emptyRadioStation = [];

  fileNames.forEach(function (fileName) {
    const radioFilePath = path.join(__dirname, `./data/radio-station-${fileEnding}/${fileName}-${fileEnding}.json`);
    const radioData = JSON.parse(fs.readFileSync(radioFilePath));
    if (radioData.length === 0) {
      emptyRadioStation.push(fileName);
    }
  });

  return emptyRadioStation;
}

// Find countries that the radio station list has not been scrapped
const findRemainingCountries = async (folderName, fileEnding) => {
  // Checking through the folder for scrapped radio list
  const folderPath = path.join(__dirname, `./data/${folderName}`);
  const filesInFolder = await fs.readdirSync(folderPath);
  const fileNames = [];
  filesInFolder.forEach(function (file) {
    const fileName = file.substring(0, file.indexOf(`-${fileEnding}.json`));
    fileNames.push(fileName);
  });

  // Get the countries that has not been scraped at all
  const allCountriesData = getMerger('countries');
  const remainingCountries = allCountriesData.filter(country => !fileNames.includes(country.name));

  // Get the countries that did not scrape properly as result of failed internet connection in the first attempt
  const emptyRadioStation = findEmptyRadioStation(fileNames, fileEnding);
  const emptyRadioStationList = allCountriesData.filter(country => emptyRadioStation.includes(country.name)) ;

  const finalList = [
    ...remainingCountries,
    ...emptyRadioStationList
  ];

  return finalList;
}

// Find countries radio list that the radio station info has not been scrapped
const findRemainingRadioList = async () => {
  // Checking through the folder for scrapped radio list
  const folderPath = path.join(__dirname, `./data/radio-station-list`);
  const filesInFolder = await fs.readdirSync(folderPath);
  const fileNames = [];
  filesInFolder.forEach(function (file) {
    const fileName = file.substring(0, file.indexOf(`-list.json`));
    fileNames.push(fileName);
  });

  // Get the radio station list file that has not been scraped at all
  const allRadioListData = getMerger('radio-station-list');
  const remainingRadioList = allRadioListData.filter(radioStation => !fileNames.includes(radioStation.country));

  // Get the radio station list file that did not scrape properly as result of failed internet connection in the first attempt
  const emptyRadioInfo = findEmptyRadioStation(fileNames, 'info');
  const emptyRadioInfoList = allRadioListData.filter(radioStation => emptyRadioInfo.includes(radioStation.country));

  const finalList = [
    ...remainingRadioList,
    ...emptyRadioInfoList
  ];

  return finalList;
}

module.exports = {
  stringFormater,
  getMerger, 
  findRemainingCountries,
  findRemainingRadioList,
}
