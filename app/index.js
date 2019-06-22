import clock from "clock";
import document from "document";
import { preferences } from "user-settings";
import { units } from "user-settings";
import * as util from "../common/utils";
import { today } from "user-activity";
import { goals } from "user-activity";
import { me as device } from "device";
import { battery } from "power";
import { vibration } from "haptics";
import { HeartRateSensor } from "heart-rate";
import { display } from "display";
import * as fs from "fs";
import { BodyPresenceSensor } from "body-presence";
import { me as appbit } from "appbit";

// Update the clock every minute
clock.granularity = "minutes";

// Get a handle on the <text> element
const hourTextBox1 = document.getElementById("hours1");
const hourTextBox2 = document.getElementById("hours2");
const minutesTextBox1 = document.getElementById("minutes1");
const minutesTextBox2 = document.getElementById("minutes2");

const background1 = document.getElementById("background1");
const background2 = document.getElementById("background2");
const background3 = document.getElementById("background3");
const background4 = document.getElementById("background4");
const bar1 = document.getElementById("bar1");
const bar2 = document.getElementById("bar2");
const bar3 = document.getElementById("bar3");
const bar4 = document.getElementById("bar4");
const shadow1 = document.getElementById("shadow1");
const shadow2 = document.getElementById("shadow2");
const shadow3 = document.getElementById("shadow3");
const shadow4 = document.getElementById("shadow4");
const icon1 = document.getElementById("icon1");
const icon2 = document.getElementById("icon2");
const icon3 = document.getElementById("icon3");
const icon4 = document.getElementById("icon4");

const batteryDrain = document.getElementById("batteryDrain");

const dateTextBox = document.getElementById("dateText");
const hrTextBox = document.getElementById("hrText");
//const hrTextBox2 = document.getElementById("hrText");
const statsTextBox = document.getElementById("statsText");
const statsTextInstance = document.getElementById("statsTextInstance");
const statsBackgroundInstance = document.getElementById("statsBackgroundInstance");
const heartIconInstance = document.getElementById("heartIconInstance");

//Color profiles  0           1           2              3             4                5          6         7
let colors = [["fb-blue", "fb-red",   "fb-green",   "fb-orange",   "grey",        "fb-peach", "fb-red", "dimgray"],
             ["fb-white", "fb-white", "fb-white",   "fb-white",    "fb-light-gray","grey"    , "fb-red", "grey"],
             ["fb-blue",  "fb-blue",  "fb-blue",    "fb-blue",     "fb-cyan",    "fb-cerulean","fb-red","fb-cyan"],
             ["fb-red",   "fb-red",   "fb-red",     "fb-red",      "fb-magenta",   "fb-pink",  "fb-red","fb-magenta"],
             ["fb-green", "fb-green", "fb-green",   "fb-green",    "fb-mint",      "fb-lime",  "fb-red","fb-mint"],
             ["fb-orange","fb-orange","fb-orange",  "fb-orange",   "fb-peach",     "fb-orange","fb-red","fb-peach"],
             ["fb-plum",  "fb-plum",  "fb-plum",    "fb-plum",     "fb-magenta",   "fb-orange","fb-red","fb-magenta"],
             ["fb-white","fb-white","fb-light-gray","fb-light-gray","fb-dark-gray","fb-dark-gray","fb-red","fb-lavender"],
             ["fb-yellow","fb-yellow","fb-white",   "fb-white",    "fb-light-gray","fb-peach", "fb-red","fb-light-gray"], 
             ["fb-lime",  "fb-lime","fb-light-gray","fb-light-gray","gray",        "fb-peach", "fb-red","fb-white"]
             ];
let colProfile = 0;
let heartRateActive = 1;
let floorsActive = 1;
if (device.modelId == 38) { //Versa Lite
  floorsActive = 0;
  icon2.href = "stat_dist_open_32px.png";
}
if (device.modelId == 27) { //Ionic
  statsTextBox.y = device.screen.height - 50;
  statsBackgroundInstance.style.display = "";
}
//console.log("device ID: " + device.modelId);

const STATUS_FILE = "status.cbor";
loadStatus();

let hrm;
try {
  if (HeartRateSensor && appbit.permissions.granted("access_heart_rate")) {
    hrm = new HeartRateSensor();
    hrm.addEventListener("reading", () => {
      //console.log(`Current heart rate: ${hrm.heartRate}`);
      hrTextBox.text = ""+hrm.heartRate;
    });
    display.addEventListener("change", () => {
      // Automatically stop the sensor when the screen is off to conserve battery
      if (heartRateActive == 1)
        display.on ? hrm.start() : hrm.stop();
      else {
        hrm.stop();
        hrTextBox.style.display = "none";
      }
    });
    if (heartRateActive == 1)
      hrm.start();
    else
       hrTextBox.style.display = "none";
  }
  if (BodyPresenceSensor) {
    const body = new BodyPresenceSensor();
    body.addEventListener("reading", () => {
      if (body.present) {
        hrTextBox.style.display = "";
        //hrTextBox2.style.display = "";
        heartIconInstance.animate("enable");
      } else {
        hrTextBox.style.display = "none";
        //hrTextBox2.style.display = "none";
      }
    });
    body.start();
  }
} catch (ex) {
  console.log(ex);
}

// Update the <text> element every tick with the current time
clock.ontick = (evt) => {
  let today = evt.date;
  let hours = today.getHours();
  let mins = today.getMinutes();
  if (preferences.clockDisplay === "12h") {
    // 12h format
    hours = hours % 12 || 12;
  }
  let hourDigit1 = Math.floor(hours / 10);
  let hourDigit2 = hours % 10;
  let minDigit1 = Math.floor(mins / 10);
  let minDigit2 = mins % 10;

  hourTextBox1.text = ""+hourDigit1;
  hourTextBox2.text = ""+hourDigit2;
  minutesTextBox1.text = ""+minDigit1;
  minutesTextBox2.text = ""+minDigit2;
  
  let monthnum = today.getMonth();
  let day = today.getDate();
  var month = new Array();
  month[0] = "January";
  month[1] = "February";
  month[2] = "March";
  month[3] = "April";
  month[4] = "May";
  month[5] = "June";  
  month[6] = "July";
  month[7] = "August";
  month[8] = "September";
  month[9] = "October";
  month[10] = "November";
  month[11] = "December";
  let monthname = month[monthnum];
  dateTextBox.text = `${monthname} ${day}`;
  
  updateSteps();
  if (floorsActive)
    updateFloors();
  else
    updateDist();
  updateActive();
  updateCals();
  updateBattery();
}

function updateSteps() {
  try {
    let steps = today.adjusted.steps || 0;
    let goal = goals.steps || 10000;
    let complete = steps / goal;
    //console.log("steps: "+steps+", goal: "+goal);
    bar1.height = complete * 142;
    bar1.y = device.screen.height/2 + 82 - bar1.height;
    shadow1.y = bar1.y - 3;
  } catch (ex) {
    console.log(ex);
  }
}

function updateFloors() {
  try {
    let floors = today.adjusted.elevationGain || 0;
    let goal = goals.elevationGain || 30;
    let complete = floors / goal;

    bar2.height = complete * 142;
    bar2.y = device.screen.height/2 + 82 - bar2.height;
    shadow2.y = bar2.y - 3;
  } catch (ex) {
    console.log(ex);
  }
}

function updateDist() {
  try {
    let dist = today.adjusted.distance || 0;
    let goal = goals.distance || 30;
    let complete = dist / goal;

    bar2.height = complete * 142;
    bar2.y = device.screen.height/2 + 82 - bar2.height;
    shadow2.y = bar2.y - 3;
  } catch (ex) {
    console.log(ex);
  }
}

function updateActive() {
  try {
    let am = today.adjusted.activeMinutes || 0;
    let goal = goals.activeMinutes || 60;
    let complete = am / goal;

    bar3.height = complete * 142;
    bar3.y = device.screen.height/2 + 82 - bar3.height;
    shadow3.y = bar3.y - 3;
  } catch (ex) {
    console.log(ex);
  }
}

function updateCals() {
  try {
    let cals = today.adjusted.calories || 0;
    let goal = goals.calories || 2500;
    let complete = cals / goal;

    bar4.height = complete * 142;
    bar4.y = device.screen.height/2 + 82 - bar4.height;
    shadow4.y = bar4.y - 3;
  } catch (ex) {
    console.log(ex);
  }
}

function updateBattery() {
  try {
    let charge = battery.chargeLevel;
    let drain = 100 - charge;

    batteryDrain.height = Math.floor(drain/100 * 24);
    
    let objects = document.getElementsByClassName("battery");
    objects.forEach(function(object, index) {
      if (charge >= 50)
        object.style.fill = colors[colProfile][4];
      else if (charge >= 25)
        object.style.fill = colors[colProfile][5];
      else
        object.style.fill = colors[colProfile][6];
    });
  } catch (ex) {
    console.log(ex);
  }
}

document.getElementById("tap1").onclick = function(e) {
  try {
    vibration.start("bump");
    let steps = today.adjusted.steps || 0;
    statsTextBox.text = ""+steps+" steps"
    statsBackgroundInstance.animate("enable");
    statsTextInstance.animate("enable");
  } catch (ex) {
    console.log(ex);
  }
};

document.getElementById("tap2").onclick = function(e) {
  try {
    vibration.start("bump");
    if (floorsActive) {
      let floors = today.adjusted.elevationGain || 0;
      statsTextBox.text = ""+floors+" floors"
    } else {
      let dist = today.adjusted.distance || 0;
      if (units.distance === "us") 
        statsTextBox.text = ""+Math.round(((dist/1609)*10))/10+" miles";
      else
        statsTextBox.text = ""+Math.round(((dist/1000)*10))/10+" km";
    }
    statsBackgroundInstance.animate("enable");
    statsTextInstance.animate("enable");
  } catch (ex) {
    console.log(ex);
  }
};

document.getElementById("tap3").onclick = function(e) {
  try {
    vibration.start("bump");
    let am = today.adjusted.activeMinutes || 0;
    statsTextBox.text = ""+am+" minutes"
    statsBackgroundInstance.animate("enable");
    statsTextInstance.animate("enable");
  } catch (ex) {
    console.log(ex);
  }
};

document.getElementById("tap4").onclick = function(e) {
  try {
    vibration.start("bump");
    let cals = today.adjusted.calories || 0;
    statsTextBox.text = ""+cals+" calories"
    statsBackgroundInstance.animate("enable");
    statsTextInstance.animate("enable");
  } catch (ex) {
    console.log(ex);
  }
};

document.getElementById("tapBattery").onclick = function(e) {
  try {
    vibration.start("bump");
    let charge = battery.chargeLevel;
    statsTextBox.text = ""+Math.floor(charge)+"% battery"
    statsBackgroundInstance.animate("enable");
    statsTextInstance.animate("enable");
  } catch (ex) {
    console.log(ex);
  }
};

document.getElementById("tapIcons").onclick = function(e) {
  try {
    vibration.start("bump");
    colProfile++;
    if (colProfile >= colors.length)
      colProfile = 0;

    applyColorProfile();
    saveStatus();
  } catch (ex) {
    console.log(ex);
  }
};

document.getElementById("tapDate").onclick = function(e) {
  try {
    vibration.start("bump");
    let dist = today.adjusted.distance || 0;
    if (units.distance === "us") 
      statsTextBox.text = ""+Math.round(((dist/1609)*10))/10+" miles";
    else
      statsTextBox.text = ""+Math.round(((dist/1000)*10))/10+" km";
    statsBackgroundInstance.animate("enable");
    statsTextInstance.animate("enable");
  } catch (ex) {
    console.log(ex);
  }
};

document.getElementById("tapHR").onclick = function(e) {
  try {
    vibration.start("bump");
    if (HeartRateSensor && appbit.permissions.granted("access_heart_rate")) {
      heartIconInstance.animate("enable");
      heartRateActive = 1 - heartRateActive;
      saveStatus();

      if (heartRateActive == 0) {
        hrm.stop();
        hrTextBox.style.display = "none";
      }
      else {
        hrm.start();
        hrTextBox.style.display = "";
      }
    }
  } catch (ex) {
    console.log(ex);
  }
};

function applyColorProfile() {
  try {
    let cols = colors[colProfile];
    background1.gradient.colors.c1 = cols[0];
    bar1.style.fill = cols[0];
    icon1.style.fill = cols[0];
    background2.gradient.colors.c1 = cols[1];
    bar2.style.fill = cols[1];
    icon2.style.fill = cols[1];
    background3.gradient.colors.c1 = cols[2];
    bar3.style.fill = cols[2];
    icon3.style.fill = cols[2];
    background4.gradient.colors.c1 = cols[3];
    bar4.style.fill = cols[3];
    icon4.style.fill = cols[3];
    updateBattery();
    dateTextBox.style.fill = cols[7];
    hrTextBox.style.fill = cols[7];
  } catch (ex) {
    console.log(ex);
  }
}

function loadStatus() {
  try {
    let status = fs.readFileSync(STATUS_FILE, "cbor");
    colProfile = status.colProfile;
    applyColorProfile();
    heartRateActive = status.heartRateActive;
    if (heartRateActive != 0 && heartRateActive != 1)
      heartRateActive = 1;
    //console.log("HR: " + heartRateActive);
  } catch (ex) {
    //console.log(ex);
  }
}

function saveStatus() {
  try {
    let status = {"colProfile":colProfile,
                  "heartRateActive":heartRateActive
                 };
    fs.writeFileSync(STATUS_FILE, status, "cbor");
  } catch (ex) {
  }
}