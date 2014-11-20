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
function find(subject, list){
	for (var i = 0, len = list.length; i < len; i++) {
		if(list[i].sujet == subject){
			console.log(list[i].nbApparitions);
			return i;
		}
	}
	console.log("Pas trouvé");
	return undefined;

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
			console.log(link.toString());
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
				subjectInList[subjectInList].frequency = parseInt(subjectInList[i].frequency) + 1 + "";
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

console.log("Longueur de la liste : " + subjectsList.length);
console.log("Le dernier element apparait : " + subjectsList[subjectsList.length-1].frequency + " fois.")
