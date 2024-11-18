import { master2storyline, sgbFile } from "../io/sgb"
import { align, sample } from "../model/Align";
import { qpNum, qpVar, stringify } from "../model/QPSupport";

export const App = (props: {}) => {
  console.log(master2storyline(sgbFile('loose', 'master').tryParse(`
* A freely invented storyline of a possible "The Flintstones" cartoon
* It serves as an example for a storyline master file.


  FF Fred Flintstone, called Fred, bronto-crane operator
WF Wilma Flintstone, called Wilma, wife of Fred Flintstone
*
PF Pebbles Flintstone, called Pebbles, the Flintstones’ infant daughter
BR Bernard Matthew Rubble, called Barney, Fred’s best friend and next-door neighbor
* test
ER Elizabeth Jean Rubble, called Betty, Barney’s wife and Wilma’s best friend
BB Bamm-Bamm Rubble, called Bamm-Bamm, the Rubbles’ abnormally strong adopted son

1 2 : FF : FF
* incomplete layer description
2 : WF,BR;FF,ER,BB :WF,BR,FF,ER,BB
  3 : WF,FF;PF;BR,ER;BB : WF,FF,PF,BR,ER
44 : BR,ER;WF,FF;PF;BB : BR,ER,WF,FF,PF
* this is a layer description
* group1   ;  group two
5454565341234513452345 : PF,FF;ER,BR,BB : PF,FF,ER,BR,BB
* end of file


`)))
  console.log(stringify(qpVar('x').plus(qpVar('y').scale(4).minus(qpNum(3))).squared()));
  console.log(stringify(qpNum(1)
    .plus(qpVar('x').plus(qpVar('y').scale(4).minus(qpNum(3))).squared())
    .plus(qpVar("x").scale(5))
    .plus(qpVar('z').minus(qpVar('y').scale(2)).squared())
  ));
  console.log(stringify(qpVar('z').minus(qpVar('y').scale(2)).squared()));
  console.log(stringify(qpVar('x').scale(8).greaterThanOrEqual(qpVar('y').plus(qpNum(3)).scale(-1.5))))
  align(sample, 'least-squares', 2).then(console.log);
  return "";
}
