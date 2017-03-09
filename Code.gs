// -- Course Requests System - By achiu@ais.edu.hk --
// This App allows students to request courses for next year
//

// -- GLOBALS --
//Get Lists from Spreadsheet
//var myListDocID = '1rFZt8Odx-dtn5k2Y5BBMXXCsXeF5OpdqFmHyZpq1KbA'; //Trial Course List File
var myListDocID = '0AkB30i6AUCFldDFfTkZwZmpOMThOOGZjZEZzVmNtNUE'; // Live Course List File Apr 2012-13 for 2013-2014 choices
var myCoursePlannerDocId = '1S6UK3WKSo_y703TLL2Rt91Ia_che6mnOBM2o1LIxXb0'; //document with data on courses for upcoming year.


var deptDefnSheet = 'Department Definition';
var courseDefnSheet = 'Course Definition 2017-18';

//Spreadsheet sheet names for Get Lists...
var myListSheetName = 'Choices';
var myCreditsSheetName = 'Transcript';
var myGradReqsSheetName = 'GradReqs';
var myStudentDataSheetName = 'StudentList';
var myCourseDefinitionSheet = 'Courses';
var myPrincipalApproverSheet = "PrincipalApprover";

//Spreadsheet for saving student choices and Teacher Recommendations. 
//var mySurveyCollector = '1LsiB1BFZgc-RjmQ0zFUw4cNvAkyz7nSnKqLmPT70tCY'; //Trial Spreadsheet 2016
var mySurveyCollector = '0AkB30i6AUCFldFVyTzY1U012cGlBT29aQTFfMHIwMmc'; //Live collector 


var mySurveySheetName = 'Results'; //Results sheet 
var mySurveyDraftSheetName = 'Draft Results';
//var mySurveySheetName = 'Results-V2'; //Current results sheet with 2 Adv List Choices (obsolete - moved over to "results")
var mySurveyCourseCounts = 'CourseCounts';
var myRecommendationSheetName = 'Request';
var myRequestsSheetName = 'Request';

//Get User

var thisUser = Session.getActiveUser().getEmail(); //Logged In User
//var thisUser = 'cgray@ais.edu.hk';  // test for a HRM teacher
//var thisUser = '210135@ais.edu.hk' //Rick Wang HRM11-2


//Globals for displaying course options in each block
var coursePerLine = 3; //obsolete!
var courseFontSize = '9px';

var DisableDateLocking = false; //turns on or off the date lock out.


//For HTMLService app (from template)
//var userSheetName = 'Members';
var challengeSheetName = 'Course Selections';
var appTitle = 'Course Requests System';
var entityTitle = 'Selections'; // used in titles throughout app


//
// -----
//  doGet - main function for web app
// -----
function doGet(){
  var myDoc = 'index';  
  return HtmlService.createTemplateFromFile(myDoc).evaluate().setSandboxMode(HtmlService.SandboxMode.IFRAME);
}


function trial(){
  var ListDoc = SpreadsheetApp.openById(myListDocID);
  var courseDefinition = ListDoc.getSheetByName(myCourseDefinitionSheet).getDataRange().getValues();
  var timetable = timetableView(courseDefinition);
  Logger.log(timetable);
}

// ----
// function loadGInfo() - Gets all info from spreadsheets and passes it back to the client
// -----
function loadGInfo() {

  var ListDoc = SpreadsheetApp.openById(myListDocID);
  var SurveyDoc = SpreadsheetApp.openById(mySurveyCollector);
  var coursesDoc = SpreadsheetApp.openById(myCoursePlannerDocId);
  
  //Check are we adventure week approver, HRM teacher or student.
  var userType = {isStudent: false, isAdvisor: false, isApprover: false, isParent: false}; //An object to track what roles the user has
  var error = {status: false, class: "bg-danger", msg: "Error"};
  
//  var approverList = ListDoc.getSheetByName(myApproverListSheetName).getDataRange().getValues();
  var studentList = ListDoc.getSheetByName(myStudentDataSheetName).getDataRange().getValues();
  var courseDefn = coursesDoc.getSheetByName(courseDefnSheet).getDataRange().getValues();
  var deptDefn = coursesDoc.getSheetByName(deptDefnSheet).getDataRange().getValues();
  var myCredList = ListDoc.getSheetByName(myCreditsSheetName).getDataRange().getValues();
  var myGradReqs = ListDoc.getSheetByName(myGradReqsSheetName).getDataRange().getValues();
  var recList = SurveyDoc.getSheetByName(myRecommendationSheetName).getDataRange().getValues();

//  var myApprover = getRowsMatching(approverList, 0, thisUser);
  var myAdvisor = getRowsMatching(studentList, 5, thisUser);
  var myStudentInfo = getRowsMatching(studentList, 1, thisUser);
  var myChildInfo = getRowsMatching(studentList, 14, thisUser);
  var studentInfo = [];
  var choiceData = [];
  var canPost = false;

//  userType.isApprover = (myApprover.length > 0);//We are an approver
  userType.isAdvisor = (myAdvisor.length > 0); //We are an advisor
  userType.isStudent = (myStudentInfo.length > 0); //We are a student
  userType.isParent = (myChildInfo.length > 0); //We are a parent
  
  //Gather data relevant to the roles
  if (userType.isApprover) { //We are an approver
    studentInfo = textifyDates(studentList.slice(1)); //prepare student info
    Logger.log(studentInfo);
    
  } else if (userType.isAdvisor) { //we are an advisor
    studentInfo = textifyDates(myAdvisor);

  } else if (userType.isStudent) { //we are a student
    Logger.log(myStudentInfo);
    canPost = checkCanPost(myStudentInfo); 
    studentInfo = textifyDates(myStudentInfo);
    var myCreds = textifyDates(getMyCredits(thisUser, myCredList));
     Logger.log(myCreds);   
    //Get Recommendations    
    var myRecs = textifyDates(getMyRecommendations(thisUser, recList));
    choiceData = getMyChoices(studentInfo, courseDefn, myCreds, myRecs)
    
    if(!myStudentInfo[0][7]) error = {status: true, class: "bg-danger", msg: "It seems the survey is not open to you."}
  } else if (userType.isParent) { //we are a parent
     //Parent User Data
     
  } else {
    error.msg = "You don't have permissions to view anything here.";
    error.status = true;
  }
  
  //Get 4-year-planner data
  var fourYearPlanDefn = { "HRM08": { title: "Grade 9", col: 7}, 
                           "HRM09": { title: "Grade 10", col: 8}, 
                           "HRM10": { title: "Grade 11", col: 9}, 
                           "HRM11": { title: "Grade 12", col: 10}};        
  
  return {studentInfo: studentInfo, 
          choiceData: choiceData, 
          userType: userType, 
          courseDefn: courseDefn, 
          deptDefn: deptDefn,  
          error: error, 
          transcript: myCreds, 
          GradReqs: myGradReqs, 
          recData: myRecs, 
          fourYearPlan: fourYearPlanDefn,
          canPost: canPost};
  

}



function checkCanPost(studentInfo){
  var timeOpen = DisableDateLocking || (new Date() >= studentInfo[0][8]); //Is date locking disabled (see globals) or is "Date For Access" for this student before today's date (therefore meaning they CAN access)
  var canPost = (studentInfo[0][7] && timeOpen); //Check "Survey Permitted" column for this student, and if timeOpen is TRUE (line above)
  return canPost;
}

//-----
//function getMyChoices(student, courseDefn) returns a choice object of all choices and the current choices for a student
//-----
function getMyChoices(studentInfo, courseDefn, myTranscript, myRequests){
  var myChoices = {};
  var myID = studentInfo[0][0]; //student ID
  
  for(var crs=0; crs < courseDefn.length; crs++) { //for each course in courseDefn, create an entry in myChoices data
    var thisRequestID = myID + courseDefn[crs][1];
    myChoices[courseDefn[crs][1]] = {
                                  request: false,
                                  recommended : false,
                                  completed : false,
                                  department: courseDefn[crs][4],
                                  courseName: courseDefn[crs][3],
                                  courseCode: courseDefn[crs][1],
                                  courseData: courseDefn[crs],
                                  requestID: thisRequestID
                                     };
  }
  
  for(var req=0; req < myRequests.length; req++){  //Get all this students' requests and update request and recommended fields if needed.
    if(myRequests[req][8]) myChoices[myRequests[req][3]].request = true;
    if(myRequests[req][7]) myChoices[myRequests[req][3]].recommended = true;
  } 
  
  for(var r=0; r < myTranscript.length; r++){  //loop through all transcript entries and mark completed any course that has been completed.
    var courseCode = myTranscript[r][9].substring(0,5);
    if ( courseCode in myChoices) myChoices[courseCode].completed = true;    
  }

  return myChoices;
}


//-----
// function getStudentInfo(myID) returns all student listing info if thisUser is in Principals list
//-----
function getPrincipalInfo(myID){

  var studentInfo = [];
  var myPrincipalList = SpreadsheetApp.openById(myListDocID).getSheetByName(myPrincipalApproverSheet).getDataRange().getValues();
  
  for (var i =0; i < myPrincipalList.length; i++){
    if (myID === myPrincipalList[i][0]) studentInfo = SpreadsheetApp.openById(myListDocID).getSheetByName(myStudentDataSheetName).getDataRange().getValues().splice(1);  
  }
  return studentInfo;
}


//-----
// function getStudentInfo(myID) returns the student listing info for thisUser
//-----
function getTeacherInfo(myID){

  var myStudentListsheet = SpreadsheetApp.openById(myListDocID).getSheetByName(myStudentDataSheetName);  
  var LastSsRow = myStudentListsheet.getLastRow()-1;
  var studentInfo = getRowsMatching(myStudentListsheet.getRange(2, 1, LastSsRow,myStudentListsheet.getLastColumn()).getValues(),5,myID);

  return studentInfo;
}


//-----
//function getMyRecommendations() returns the recommendations of the student
//-----
function getMyRecommendations(student, recList){

  //var myRecommended = ArrayLib.filterByText(myRecommendedSheet.getRange(2, 1, LastRecRow,5).getValues(), 2, thisUser);
  var myRecommended = getRowsMatching(recList, 2, student);
  //Sort the items by course code
      myRecommended.sort(function(a, b){ 
        var x = a[3];
        var y = b[3];
        return (x < y ? -1 : (x > y ? 1 : 0));}); 
  return myRecommended;
}


function getMyCredits(student, myCredList){
  //Get User's Credits List & Graduation Requirements & Teacher Recommendations

  //var LastCredRow = myCredList.getLastRow() -1;
  var CredList = getRowsMatching(myCredList,1,student);

  return CredList;
}


// Posts the request data
function postData(action, recID, studentInfo, course, department){
  
  var thisUserStudID = studentInfo[0][0];
  var studentEmail = studentInfo[0][1];
  var sheet = SpreadsheetApp.openById(mySurveyCollector).getSheetByName(myRecommendationSheetName);
  
  var recSheetData = sheet.getDataRange().getValues();
  
  
  //Logger.log([action, recID, studentEmail, course, actionAdd]);
  var label2 = false;
  //If record doesn't exist then write it
  var recExists = ArrayLib.indexOf(recSheetData, 0, recID);
      
  var myTimeStamp = new Date();

  var lock = LockService.getPublicLock();
  lock.waitLock(30000);
  
  //Get the right row number
  if(recExists >= 0){   //Write the row (update if exists)
    var thisRow = ArrayLib.indexOf(sheet.getRange(1,1,sheet.getLastRow(),1).getValues(), 0, recID) +1; 
    var targetRange = sheet.getRange(thisRow, 9, 1, 3).setValues([[action, myTimeStamp, thisUser]] );
  } else {   //Write the row if new
    var thisRow = sheet.getLastRow()+1;
    var targetRange = sheet.getRange(thisRow, 1, 1, 11).setValues([[recID, thisUserStudID, studentEmail, course, department, "", "", "", action, myTimeStamp, thisUser]] );
  }
  
  // clean up and release the lock
  SpreadsheetApp.flush();
  lock.releaseLock();
  
  var readUpdate = textifyDates(sheet.getDataRange().getValues());
 
  return readUpdate[thisRow-1];
}


// ----
// 
// ----
function postApproval(data){
  var studentID = data.studentID;
  var approval = data.approval;
  var HRM = data.HRM;
  var clientIndex = data.index;
  
  var mySurveyFile = SpreadsheetApp.openById(mySurveyCollector);
  var sheet = mySurveyFile.getSheetByName(mySurveySheetName);
  var countSheet = mySurveyFile.getSheetByName(mySurveyCourseCounts);

  
  //write approval, editing user
  // get the lock, because we're now modifying the shared resource
  var lock = LockService.getPublicLock();
  lock.waitLock(30000);
  
  //Get the survey data.
  var lastRow = sheet.getLastRow();
  var sheetData = sheet.getRange(1,1,lastRow,14).getValues();
  var thisRow = getExistingRow(sheetData,0,studentID);  

  Logger.log(thisRow);
    
  //If record exists, make the change
    if (thisRow < lastRow){
      var nowTime = new Date();
      var approvaldata = sheet.getRange(thisRow+1, 5, 1, 1).setValues([[approval]] );
      var updatedbyData = sheet.getRange(thisRow+1, 15, 1, 2).setValues([[thisUser, nowTime]] );

    SpreadsheetApp.flush();
    // clean up and release the lock
    lock.releaseLock();
    }
      //Get the survey data.
    var lastRow = sheet.getLastRow();
    var sheetData = sheet.getDataRange().getValues();
    var thisRow = getExistingRow(sheetData,0,studentID);  

      //get course counts
      var courseCountsSheet = mySurveyFile.getSheetByName(mySurveyCourseCounts);  
      var courseCounts = courseCountsSheet.getRange(2,1,courseCountsSheet.getLastRow()-1,3).getValues();
      
    //If record exists, pass back the change
      if (thisRow < lastRow){
        return {courseCounts: courseCounts, data: textifyDates1D(sheetData[thisRow]), index: clientIndex, error: "" };
      }
      return {data: data, index: clientIndex, error: "Could not save / read data"};

}


// ----
// postPApproval(data) - posts principal's approval
// ----
function postPApproval(data){
  var studentID = data.studentID;
  var approval = data.approval;
  var HRM = data.HRM;
  var clientIndex = data.index;
  var choices = data.choices;
  Logger.log(choices);
  
  var passTest = true;
  //Check we have permission to approve
  passTest = getPrincipalInfo(thisUser).length > -1; 
  //check choices data exists and has been filled 

  if(passTest){   
    var mySurveyFile = SpreadsheetApp.openById(mySurveyCollector);
    var sheet = mySurveyFile.getSheetByName(mySurveySheetName);
    var countSheet = mySurveyFile.getSheetByName(mySurveyCourseCounts);
  
    
    //write approval, editing user
    // get the lock, because we're now modifying the shared resource
    var lock = LockService.getPublicLock();
    lock.waitLock(30000);
    
    //Get the survey data.
    var lastRow = sheet.getLastRow();
    var sheetData = sheet.getRange(1,1,lastRow,14).getValues();
    var thisRow = getExistingRow(sheetData,0,studentID);  
  
    Logger.log(thisRow);
      
    //If record exists, make the change
      if (thisRow < lastRow){
        var nowTime = new Date();
        //TRUE	APS5E.01	HEA5C.01	CTD4C.01	ENG4C.03	MCA5C.11	MCA5C.21	SEN4C.02			achiu@ais.edu.hk	15/04/2016 15:28:17	TRUE
        var approvaldata = sheet.getRange(thisRow+1, 5, 1, 13).setValues([[approval, choices[5], choices[6], choices[7], choices[8], choices[9], choices[10], choices[11], choices[12], choices[13], thisUser, nowTime, approval]] );
        //var updatedbyData = sheet.getRange(thisRow+1, 15, 1, 3).setValues([[thisUser, nowTime, approval]] );
  
      SpreadsheetApp.flush();
      // clean up and release the lock
      lock.releaseLock();
      }
        //Get the survey data.
      var lastRow = sheet.getLastRow();
      var sheetData = sheet.getRange(1,1,lastRow,17).getValues();
      var thisRow = getExistingRow(sheetData,0,studentID);  
  
      Logger.log(thisRow);
      
      //get course counts
      var courseCountsSheet = mySurveyFile.getSheetByName(mySurveyCourseCounts);  
      var courseCounts = courseCountsSheet.getRange(2,1,courseCountsSheet.getLastRow()-1,3).getValues();
      
    //If record exists, pass back the change
      if (thisRow < lastRow){
        return {courseCounts: courseCounts, data: textifyDates1D(sheetData[thisRow]), index: clientIndex, error: "" };
      }
      return {data: data, index: clientIndex, error: "Could not save / read data"};
    } else {
       return {data: data, index: clientIndex, error: "Wrong permissions of data problem - could not save."};
    }
}



// Creates a simple, usable timetable view for each block
function timetableView(choices){
  
  var rows = [1,2,3,4,5,6,7];
  var rowIndx = 0;
  var cols = [1,2,3,4,5];
  var colIndx = 1;
  

  var myCells = [];
  var firstLine = [];
  firstLine.push("Block");
  for (var d=0; d < cols.length; d++){ firstLine.push(cols[d]); }
  myCells.push(firstLine);
  
  for (var r=0; r < rows.length; r++){

    var thisRowData = ArrayLib.filterByValue(choices, 0, rows[r]);
    var thisRowCells = [];
    thisRowCells.push(['Block ' + rows[r]]);
    for (var c=0; c < cols.length; c++){
      var thisCell = "";
      var thisCellData = ArrayLib.sort(ArrayLib.filterByValue(thisRowData, 13, cols[c]), 12, true);
      for (var i=0; i < thisCellData.length; i++){
        thisCell += thisCellData[i][12] + '\n';
      }
      thisRowCells.push(thisCell);
      
    }
    myCells.push(thisRowCells);
  }
  return myCells;
}


// ------------------------------------ USEFUL FUNCTIONS--------------------------------------------------
//

//-----
// function textifyDates(myArr) - converts all dates into text format - assumes a 2D array as an input, returns the array.
//-----
function textifyDates(myArr){
  
  
  for(var r=0; r < myArr.length; r++){
    for(var c=0; c < myArr[r].length; c++){
      if (Object.prototype.toString.call(myArr[r][c]) === '[object Date]'){
        try {           
          //myArr[r] = myArr[r].toString();
          myArr[r] = Utilities.formatDate(myArr[r], "GMT+08:00", "dd-MMM-yyyy")
        } 
        catch(err) { myArr[r][c] = err};
      }
    }
  }
  return myArr;
}

//-----
// function textifyDates(myArr) - converts all dates into text format - assumes a 2D array as an input, returns the array.
//-----
function textifyDates1D(myArr){
  
  for(var r=0; r < myArr.length; r++){
      if (Object.prototype.toString.call(myArr[r]) === '[object Date]'){
        try {
          //myArr[r] = myArr[r].toString();
          myArr[r] = Utilities.formatDate(myArr[r], "GMT+08:00", "dd-MMM-yyyy")
          } 
        catch(err) { myArr[r] = err};
      }
    
  }
  return myArr;
}


//-----
// getExistingRow - returns the row that contains the data matching the criteria, or returns the next row in the spreadsheet.
//
//-----
function getExistingRow(myList,checkCol,checkCriteria){
  var myRow = 0;
  while (myRow < myList.length){
    if (myList[myRow][checkCol] == checkCriteria) {
      return myRow;
    }
    myRow++;
  } 
  return myRow;
}


function usableColValues(coldata, lastrow) {
  for( var i = (lastrow - 1) ; i > 0; i--){

    if(coldata[i] != "") {
      return coldata.slice(0,i+1);
      };
  };
  return coldata;
}



//getRowsMatching takes a data list and searches the sortIndex for all values that match valueToFind, returning the rows that match this value

function getRowsMatching(myDataList, sortIndex, valueToFind){
  
  var foundList = new Array();
  
  myDataList.sort(function(a, b){ //Sort the items by studentID
    var x = a[sortIndex];
    var y = b[sortIndex];
    return (x < y ? -1 : (x > y ? 1 : 0));});
  
  var cdr = 0;
  var found = false; 

  while ( cdr < myDataList.length){
    if (myDataList[cdr][sortIndex] == valueToFind) {
      found=true;
      foundList.push(myDataList[cdr])
    }
    else if (found){
      return foundList;
    }
    cdr++;
  }

  return foundList;
  
}

// -----
// include - include files
// -----
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename)
      .getContent();
}
