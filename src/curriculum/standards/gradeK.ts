import type { StandardInfo } from '../types';

/** Kindergarten content standards (official CA CCSSM text). */
export const GRADE_K_STANDARDS: readonly StandardInfo[] = [
  // Counting and Cardinality
  {
    code: 'K.CC.1',
    grade: 'K',
    domain: 'CC',
    cluster: 'Know number names and the count sequence.',
    text: 'Count to 100 by ones and by tens.',
  },
  {
    code: 'K.CC.2',
    grade: 'K',
    domain: 'CC',
    cluster: 'Know number names and the count sequence.',
    text: 'Count forward beginning from a given number within the known sequence (instead of having to begin at 1).',
  },
  {
    code: 'K.CC.3',
    grade: 'K',
    domain: 'CC',
    cluster: 'Know number names and the count sequence.',
    text: 'Write numbers from 0 to 20. Represent a number of objects with a written numeral 0–20 (with 0 representing a count of no objects).',
  },
  {
    code: 'K.CC.4',
    grade: 'K',
    domain: 'CC',
    cluster: 'Count to tell the number of objects.',
    text:
      'Understand the relationship between numbers and quantities; connect counting to cardinality. ' +
      'a. When counting objects, say the number names in the standard order, pairing each object with one and only one number name and each number name with one and only one object. ' +
      'b. Understand that the last number name said tells the number of objects counted. The number of objects is the same regardless of their arrangement or the order in which they were counted. ' +
      'c. Understand that each successive number name refers to a quantity that is one larger.',
  },
  {
    code: 'K.CC.5',
    grade: 'K',
    domain: 'CC',
    cluster: 'Count to tell the number of objects.',
    text:
      'Count to answer “how many?” questions about as many as 20 things arranged in a line, a rectangular array, or a circle, or as many as 10 things in a scattered configuration; given a number from 1–20, count out that many objects.',
  },
  {
    code: 'K.CC.6',
    grade: 'K',
    domain: 'CC',
    cluster: 'Compare numbers.',
    text:
      'Identify whether the number of objects in one group is greater than, less than, or equal to the number of objects in another group, e.g., by using matching and counting strategies. (Includes groups with up to ten objects.)',
  },
  {
    code: 'K.CC.7',
    grade: 'K',
    domain: 'CC',
    cluster: 'Compare numbers.',
    text: 'Compare two numbers between 1 and 10 presented as written numerals.',
  },
  // Operations and Algebraic Thinking
  {
    code: 'K.OA.1',
    grade: 'K',
    domain: 'OA',
    cluster: 'Understand addition as putting together and adding to, and understand subtraction as taking apart and taking from.',
    text:
      'Represent addition and subtraction with objects, fingers, mental images, drawings, sounds (e.g., claps), acting out situations, verbal explanations, expressions, or equations.',
  },
  {
    code: 'K.OA.2',
    grade: 'K',
    domain: 'OA',
    cluster: 'Understand addition as putting together and adding to, and understand subtraction as taking apart and taking from.',
    text: 'Solve addition and subtraction word problems, and add and subtract within 10, e.g., by using objects or drawings to represent the problem.',
  },
  {
    code: 'K.OA.3',
    grade: 'K',
    domain: 'OA',
    cluster: 'Understand addition as putting together and adding to, and understand subtraction as taking apart and taking from.',
    text:
      'Decompose numbers less than or equal to 10 into pairs in more than one way, e.g., by using objects or drawings, and record each decomposition by a drawing or equation (e.g., 5 = 2 + 3 and 5 = 4 + 1).',
  },
  {
    code: 'K.OA.4',
    grade: 'K',
    domain: 'OA',
    cluster: 'Understand addition as putting together and adding to, and understand subtraction as taking apart and taking from.',
    text:
      'For any number from 1 to 9, find the number that makes 10 when added to the given number, e.g., by using objects or drawings, and record the answer with a drawing or equation.',
  },
  {
    code: 'K.OA.5',
    grade: 'K',
    domain: 'OA',
    cluster: 'Understand addition as putting together and adding to, and understand subtraction as taking apart and taking from.',
    text: 'Fluently add and subtract within 5.',
  },
  // Number and Operations in Base Ten
  {
    code: 'K.NBT.1',
    grade: 'K',
    domain: 'NBT',
    cluster: 'Work with numbers 11–19 to gain foundations for place value.',
    text:
      'Compose and decompose numbers from 11 to 19 into ten ones and some further ones, e.g., by using objects or drawings, and record each composition or decomposition by a drawing or equation (e.g., 18 = 10 + 8); understand that these numbers are composed of ten ones and one, two, three, four, five, six, seven, eight, or nine ones.',
  },
  // Measurement and Data
  {
    code: 'K.MD.1',
    grade: 'K',
    domain: 'MD',
    cluster: 'Describe and compare measurable attributes.',
    text: 'Describe measurable attributes of objects, such as length or weight. Describe several measurable attributes of a single object.',
  },
  {
    code: 'K.MD.2',
    grade: 'K',
    domain: 'MD',
    cluster: 'Describe and compare measurable attributes.',
    text:
      'Directly compare two objects with a measurable attribute in common, to see which object has “more of”/“less of” the attribute, and describe the difference. For example, directly compare the heights of two children and describe one child as taller/shorter.',
  },
  {
    code: 'K.MD.3',
    grade: 'K',
    domain: 'MD',
    cluster: 'Classify objects and count the number of objects in each category.',
    text: 'Classify objects into given categories; count the numbers of objects in each category and sort the categories by count. (Limit category counts to be less than or equal to 10.)',
  },
  // Geometry
  {
    code: 'K.G.1',
    grade: 'K',
    domain: 'G',
    cluster: 'Identify and describe shapes (squares, circles, triangles, rectangles, hexagons, cubes, cones, cylinders, and spheres).',
    text:
      'Describe objects in the environment using names of shapes, and describe the relative positions of these objects using terms such as above, below, beside, in front of, behind, and next to.',
  },
  {
    code: 'K.G.2',
    grade: 'K',
    domain: 'G',
    cluster: 'Identify and describe shapes (squares, circles, triangles, rectangles, hexagons, cubes, cones, cylinders, and spheres).',
    text: 'Correctly name shapes regardless of their orientations or overall size.',
  },
  {
    code: 'K.G.3',
    grade: 'K',
    domain: 'G',
    cluster: 'Identify and describe shapes (squares, circles, triangles, rectangles, hexagons, cubes, cones, cylinders, and spheres).',
    text: 'Identify shapes as two-dimensional (lying in a plane, “flat”) or three-dimensional (“solid”).',
  },
  {
    code: 'K.G.4',
    grade: 'K',
    domain: 'G',
    cluster: 'Analyze, compare, create, and compose shapes.',
    text:
      'Analyze and compare two- and three-dimensional shapes, in different sizes and orientations, using informal language to describe their similarities, differences, parts (e.g., number of sides and vertices/“corners”) and other attributes (e.g., having sides of equal length).',
  },
  {
    code: 'K.G.5',
    grade: 'K',
    domain: 'G',
    cluster: 'Analyze, compare, create, and compose shapes.',
    text: 'Model shapes in the world by building shapes from components (e.g., sticks and clay balls) and drawing shapes.',
  },
  {
    code: 'K.G.6',
    grade: 'K',
    domain: 'G',
    cluster: 'Analyze, compare, create, and compose shapes.',
    text: 'Compose simple shapes to form larger shapes. For example, “Can you join these two triangles with full sides touching to make a rectangle?”',
  },
];
