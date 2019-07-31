const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const matter = require('gray-matter');

function walk(directory, filepaths) {
    const files = fs.readdirSync(directory);
    for (let filename of files) {
        const filepath = path.join(directory, filename);
        if (filename === 'docs.md') {
            filepaths.push(filepath);
            continue;
        }
        if (fs.statSync(filepath).isDirectory()) {
            walk(filepath, filepaths);
        }
    }
}

/**
 * Meta ingredients are found in front matter (doc.data).
 * If they are suffixed with `?` they are optional.
 *
 * We test that mandatory ingredients are present in the doc.
 *
 * We can also test specific constraints that apply to specific ingredients here
 * (for example, that `interactive_example` is properly formed)
 */
function testMetaIngredient(ingredientName, doc) {
    let ingredientIsMandatory = true;
    if (ingredientName.endsWith('?')) {
        ingredientIsMandatory = false;
        ingredientName = ingredientName.slice(0, -1);
    }

    let ingredientValue = doc.data[ingredientName];

    if (!ingredientName) {
        if (ingredientIsMandatory) {
            console.error(`Error: Missing mandatory ingredient: ${ingredientName}`);
        }
    } else {
      // validate ingredient value
    }
}

/**
 * Prose ingredients are found in the prose (doc.content).
 */
function testProseIngredient(ingredientName, doc) {
}

/**
 * ingredients is an array whose elements are either:
 * - strings or
 * - objects with one property whose value is an array of ingredients
 *
 * In the latter case we recurse to find the strings.
 *
 * Strings must be of the form `type.name` where `type` must be `prose` or `meta`.
 * We check this and pass each ingredient to the right tester for its type.
 */
function testIngredients(doc, ingredients) {
    for (let ingredient of ingredients) {
        if (typeof(ingredient) === 'string') {
            const items = ingredient.split('.');
            switch (items[0]) {
              case 'meta':
                  testMetaIngredient(items[1], doc);
                  break;
              case 'prose':
                  testProseIngredient(items[1], doc);
                  break;
              default:
                  console.error(`Error: Unrecognized ingredient type: ${items[1]}`);
            }
        } else if (typeof(ingredient) === 'object') {
            const keys = Object.keys(ingredient)
            if (keys.length != 1) {
                console.error('Error: Items in recipes must be either strings or objects containing a single property');
            }
            testIngredients(doc, ingredient[keys[0]]);
        }
    }
}

/**
 * Check that the recipe's `related_content` file exists.
 * Then pass the doc and recipe's ingredients to `testIngredients`
 */
function testDocWithRecipe(doc, recipe) {
    const relatedContentPath = path.join(process.cwd(), recipe.related_content);
    if (!fs.existsSync(relatedContentPath)) {
        console.error(`Error: Related content: ${recipe.related_content} does not exist`);
    }
    testIngredients(doc, recipe.body)
}

/**
 * Given a `doc` object containing
 * - `data` (the front matter as YAML)
 * - `content` (the prose as MD)
 * look for the named recipe, load it,
 * and pass recipe and doc into `testDocWithRecipe`
 */
function testDoc(doc) {
    const recipePath = path.join(process.cwd(), 'recipes', `${doc.data.recipe}.yaml`);
    if (fs.existsSync(recipePath)) {
      const recipe = yaml.safeLoad(fs.readFileSync(recipePath, 'utf8'));
      testDocWithRecipe(doc, recipe)
    } else {
      console.error(`Error: Recipe does not exist: ${recipePath}`);
    }
}

/**
 * Fetch all files called "docs.md" under "./content".
 * For each file, open it, read it as YAML front matter and MD prose,
 * and test it against the recipe.
 */
function testContent() {
    const items = [];
    walk(path.join(process.cwd(), './content/'), items);
    for (let docsPath of items) {
        console.log(`Testing: ${docsPath}`);
        const doc = matter(fs.readFileSync(docsPath, 'utf8'));
        testDoc(doc);
    }
}

process.exitCode = testContent();
