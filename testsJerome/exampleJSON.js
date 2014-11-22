var 	json = require('../testToSpotlight.json'),
	text = json["request"]["result"];


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
		}
	}
	return 0;
}

/*
 * La fonction bestSubjects génère une liste de @param size éléments
 * voulus classée par ordre décroissant de nombres d'apparitions dans la 
 * liste @param subjectsList.
 */
function bestSubjects(subjectsList, size){
	var toReturn=[];

	if(size > subjectsList.length)	size = subjectsList.length;

	var max = 0;
	while(toReturn.length < size){
		var maxBoucle = 0;
		var addIndice = undefined;
		for(var i=0, len=subjectsList.length; i<len; i++){
			var freqTest = subjectsList[i].frequency;
			if(freqTest > maxBoucle && (max == 0 || freqTest <= max)){
				var dejaPresent = presentInBest(toReturn, i);
				if(dejaPresent == 0) {
					addIndice = i;
					maxBoucle = freqTest;
				}
			}
		}
		toReturn.push(addIndice);
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
						"frequency" : 1,
						/*
						 * TODO : solution pour stocker les prédicats, histoire de pas avoir à tout reparcourir une fois qu'on a classé nos sujets par fréquentations.
						 * Membre triolets qui correspond à une liste de 
						"triolets " : [
							{
								"role" : role,
								"value" : value
							},
							{
								"role2" : role2,
								"value2" : value2
							},
							...
						]
						A la fin on parcourerait cette sous-liste triolets pour savoir quelle valeur on met dans notre affichage.
						*/
					}
				)
			}
			else {
				subjectsList[subjectInList].frequency = subjectsList[subjectInList].frequency + 1;
			}
			
			
			var lien = text[link];
			for(list in lien){
				//console.log("list.toString : " + list.toString());
				var val = lien[list][0];
				//console.log("val.value : " + val.value);
			}
		}
	}
}

var bestsList = bestSubjects(subjectsList, 20);
console.log("bestsList : " + bestsList.toString());

console.log("Longueur de la liste : " + subjectsList.length);
for(var i=0, len=subjectsList.length ; i<len ; i++){
	console.log("element " + i + " apparait " + subjectsList[i].frequency + " fois.");
}
