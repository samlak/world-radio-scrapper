const argv = require('yargs').argv;
const  {
  getCountriesList,
  mergeCountriesList,
  getRadioList,
  mergeRadioList,
  getRadioInfo,
  mergeRadioInfo,
  groupRadioInfo
} = require('./controller');

/**
 * ROUTES
 */

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
  } else if ( argv._[0] === "mergeRadioList" ){

    return await mergeRadioList();
  } else if ( argv._[0] === "getRadioInfo" ){

    if ( argv._[1] === "resume" ){

      return await getRadioInfo("resume");
    } else if ( argv._[1] === "status" ){

      return await getRadioInfo("status");
    }

    return await getRadioInfo();
  }  else if ( argv._[0] === "mergeRadioInfo" ){

    return await mergeRadioInfo();
  } else if ( argv._[0] === "groupRadioInfo" ){

    return await groupRadioInfo();
  } 
})();