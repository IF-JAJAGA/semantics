var 	json = require('../testToSpotlight.json'),
	text = json["request"]["result"];

//console.log(text.length);


/*
 * subjectsList : Liste d'objets de la forme :
 * {
 * 	subject : "sujet",
 * 	frequency : "1"
 * }
 * frequency >= 1
 */
var subjectsList = [];

resultats = json.results;

console.log(resultats.length);


/*
 * Functions
 */
function find(sujet, subjectsList){
	for (var i = 0, len = subjectsList.length; i < len; i++) {
		if(subjectsList[i].subject == sujet){
			return i;
		}
	}
	return undefined;
}

function presentInBest(list, i){
	if(list.length == 0)	return 0;
	for(var j=0, lenj=list.length; j<lenj; j++){
		if(list[j] == i){
			return 1;
			j = lenj;
	}
	return 0;
	}
}

/*
 * La fonction bestSubjects génère une liste de @param size éléments
 * voulus classée par ordre décroissant de nombres d'apparitions dans la 
 * liste @param subjectsList.
 */
function bestSubjects(subjectsList, size){
	var toReturn=[];

	var max = 0;
	while(toReturn.length < size){
		var maxBoucle = 0;
		var addIndice = undefined;
		for(var i=0, len=subjectsList.length; i<len; i++){
			var freqTest = subjectsList[i].frequency;
			console.log("freqTest : " + freqTest);
			if(freqTest > maxBoucle && (max == 0 || freqTest <= max)){
				var dejaPresent = presentInBest(toReturn, i);
				console.log("avant if avec dejaPresent : " + dejaPresent);
				if(dejaPresent == 0) {
					console.log("Après if");
					addIndice = i;
					maxBoucle = freqTest;
					console.log("maxBoucle : " + maxBoucle + " ; freqtest : " + freqTest);
				}
			}
		}
		console.log("addIndice : " + addIndice);
		toReturn.push(addIndice);
		console.log("toReturn : " + toReturn.toString());
		if(max==0)	max = maxBoucle;
	}
	return toReturn;
}

/*
 * End of functions
 */

/*
 * Exclude from the analysis
 */
var noGood = "xmlns";
/*
 * End of exclude
 */

for(root in resultats){
	var text = resultats[root];
	for(link in text){
		if(link.indexOf(noGood) != 0 ){
			var subjectInList = find(link,subjectsList);
			if(subjectInList == undefined){
				subjectsList.push(
					{
						"subject" : link,
						"frequency" : 1
					}
				)
			}
			else {
				subjectsList[subjectInList].frequency = subjectsList[subjectInList].frequency + 1;
			}
			
			
			var lien = text[link];
			for(list in lien){
				console.log(list.toString());
				var val = lien[list][0];
				console.log(val.value);
			}
		}
	}
}

var bestsList = bestSubjects(subjectsList, 4);
console.log("bestsList : " + bestsList.toString());

console.log("Longueur de la liste : " + subjectsList.length);
for(var i=0, len=subjectsList.length ; i<len ; i++){
	console.log("element " + i + " apparait " + subjectsList[i].frequency + " fois.");
}
