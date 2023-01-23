import { decode, encode } from "./util";
import { BP_STRINGS } from "./constants";

const bp = {
  skeleton: decode(BP_STRINGS.SKELETON),
  branches: [
    decode(BP_STRINGS.BRANCH_0),
    decode(BP_STRINGS.BRANCH_1),
    decode(BP_STRINGS.BRANCH_2),
    decode(BP_STRINGS.BRANCH_3),
    decode(BP_STRINGS.BRANCH_4),
    decode(BP_STRINGS.BRANCH_5)
  ],
  branchBottom: decode(BP_STRINGS.BRANCH_BOTTOM),
  itemUnloadingStation: decode(BP_STRINGS.ITEM_UNLOADING_STATION),
  itemLoadingStation: decode(BP_STRINGS.ITEM_LOADING_STATION),
  fluidUnloadingStation: decode(BP_STRINGS.FLUID_UNLOADING_STATION),
  fluidLoadingStation: decode(BP_STRINGS.FLUID_LOADING_STATION),
  undergroundBelts: decode(BP_STRINGS.UNDERGROUND_BELTS),
  undergroundBeltsUp: decode(BP_STRINGS.UNDERGROUND_BELTS_UP),
  undergroundPipes: decode(BP_STRINGS.UNDERGROUND_PIPES)
};

/**
 * recipeData:
 *   ingredients: array of item data
 *   products: array of item data
 *
 * item data example:
 * {
 *   class: 'item',
 *   name: 'iron-plate',
 *   stack_size: 100,
 * }
 */
export function buildCityBlockFromRecipe(recipeData) {
  const resultBp = decode(BP_STRINGS.SKELETON);
  for (
    let i = 0;
    i < recipeData.ingredients.length + recipeData.products.length;
    i++
  ) {
    // Add branch
    addEntities(/* to = */ resultBp, /* from = */ bp.branches[i]);
    // Add station
    if (i < recipeData.ingredients.length) {
      // ingredients
      if (recipeData.ingredients[i].class === "item") {
        // item
        addEntities(
          /* to = */ resultBp,
          /* from = */ buildItemUnloadingStation(recipeData.ingredients[i]),
          /* opt = */ { x: -8 * i, y: 6 * i }
        );
      } else {
        // fluid
        addEntities(
          /* to = */ resultBp,
          /* from = */ buildFluidUnloadingStation(recipeData.ingredients[i]),
          /* opt = */ { x: -8 * i, y: 6 * i }
        );
      }
    } else {
      // products
      if (
        recipeData.products[i - recipeData.ingredients.length].class === "item"
      ) {
        // item
        addEntities(
          /* to = */ resultBp,
          /* from = */ buildItemLoadingStation(
            recipeData.products[i - recipeData.ingredients.length]
          ),
          /* opt = */ { x: -8 * i, y: 6 * i }
        );
      } else {
        // fluid
        addEntities(
          /* to = */ resultBp,
          /* from = */ buildFluidLoadingStation(
            recipeData.products[i - recipeData.ingredients.length]
          ),
          /* opt = */ { x: -8 * i, y: 6 * i }
        );
      }
    }
    // Add logistic
    for (let j = 0; j < i; j++) {
      if (j < recipeData.ingredients.length) {
        if (recipeData.ingredients[j].class === "item") {
          addEntities(
            /* to = */ resultBp,
            /* from = */ bp.undergroundBelts,
            /* opt = */ { x: -8 * j, y: 6 * (i - 1) }
          );
        } else {
          addEntities(
            /* to = */ resultBp,
            /* from = */ bp.undergroundPipes,
            /* opt = */ { x: -8 * j, y: 6 * (i - 1) }
          );
        }
      } else {
        if (
          recipeData.products[j - recipeData.ingredients.length].class ===
          "item"
        ) {
          addEntities(
            /* to = */ resultBp,
            /* from = */ bp.undergroundBeltsUp,
            /* opt = */ { x: -8 * j, y: 6 * (i - 1) }
          );
        } else {
          addEntities(
            /* to = */ resultBp,
            /* from = */ bp.undergroundPipes,
            /* opt = */ { x: -8 * j, y: 6 * (i - 1) }
          );
        }
      }
    }
    // Connect power
    if (i === 0) {
      connectElectricPoles(
        findBigElectricPole(resultBp, { x: 72, y: 0 }),
        findMediumElectricPole(resultBp, { x: 68.5, y: 7.5 })
      );
    } else {
      connectElectricPoles(
        findMediumElectricPole(resultBp, { x: 69.5 - 8 * i, y: 5.5 + 6 * i }),
        findMediumElectricPole(resultBp, { x: 68.5 - 8 * i, y: 7.5 + 6 * i })
      );
    }
  }

  return encode(resultBp);
}

// Returns an bp object that adds all entities from the second bp to the first bp
function addEntities(baseBpObj, bpObj, offset = { x: 0, y: 0 }) {
  const entityNumberOffset = baseBpObj.blueprint.entities.length;
  const additionalEntities = bpObj.blueprint.entities.map((entity) => {
    const entityCloned = JSON.parse(JSON.stringify(entity));
    entityCloned.entity_number += entityNumberOffset;
    entityCloned.position.x += offset.x || 0;
    entityCloned.position.y += offset.y || 0;

    // Apply entity id offset to connections
    (entityCloned.connections?.["1"]?.red || []).forEach((connection) => {
      if (connection.entity_id) {
        connection.entity_id += entityNumberOffset;
      }
    });
    (entityCloned.connections?.["1"]?.green || []).forEach((connection) => {
      if (connection.entity_id) {
        connection.entity_id += entityNumberOffset;
      }
    });
    (entityCloned.connections?.["2"]?.red || []).forEach((connection) => {
      if (connection.entity_id) {
        connection.entity_id += entityNumberOffset;
      }
    });
    (entityCloned.connections?.["2"]?.green || []).forEach((connection) => {
      if (connection.entity_id) {
        connection.entity_id += entityNumberOffset;
      }
    });

    // Apply entity id offset to neighbours
    if (entityCloned.neighbours) {
      for (let i = 0; i < entityCloned.neighbours.length; i++) {
        entityCloned.neighbours[i] += entityNumberOffset;
      }
    }

    return entityCloned;
  });
  baseBpObj.blueprint.entities = baseBpObj.blueprint.entities.concat(
    additionalEntities
  );
  return baseBpObj;
}

function buildItemUnloadingStation(item) {
  const bpCloned = JSON.parse(JSON.stringify(bp.itemUnloadingStation));

  const trainStopEntity = bpCloned.blueprint.entities.find(
    (entity) => entity.name === "train-stop"
  );
  trainStopEntity.station = `[U] [item=${item.name}]`;

  // "signal-I" / 288
  const indicatorCombinatorEntity = bpCloned.blueprint.entities.find(
    (entity) =>
      entity.name === "arithmetic-combinator" &&
      entity.control_behavior.arithmetic_conditions.first_signal?.name ===
        "signal-I" &&
      entity.control_behavior.arithmetic_conditions.operation === "/" &&
      entity.control_behavior.arithmetic_conditions.second_constant === 288
  );
  indicatorCombinatorEntity.control_behavior.arithmetic_conditions.first_signal.type =
    "item";
  indicatorCombinatorEntity.control_behavior.arithmetic_conditions.first_signal.name =
    item.name;
  indicatorCombinatorEntity.control_behavior.arithmetic_conditions.second_constant =
    (6 * 48 * item.stack_size) / 100;

  // 28800 - "signal-I"
  const minusCombinatorEntity = bpCloned.blueprint.entities.find(
    (entity) =>
      entity.name === "arithmetic-combinator" &&
      entity.control_behavior.arithmetic_conditions.first_constant === 28800 &&
      entity.control_behavior.arithmetic_conditions.operation === "-" &&
      entity.control_behavior.arithmetic_conditions.second_signal?.name ===
        "signal-I"
  );
  minusCombinatorEntity.control_behavior.arithmetic_conditions.first_constant =
    6 * 48 * item.stack_size;
  minusCombinatorEntity.control_behavior.arithmetic_conditions.second_signal.type =
    "item";
  minusCombinatorEntity.control_behavior.arithmetic_conditions.second_signal.name =
    item.name;

  // "signal-L" / 4000
  const divideCombinatorEntity = bpCloned.blueprint.entities.find(
    (entity) =>
      entity.name === "arithmetic-combinator" &&
      entity.control_behavior.arithmetic_conditions.first_signal?.name ===
        "signal-L" &&
      entity.control_behavior.arithmetic_conditions.operation === "/" &&
      entity.control_behavior.arithmetic_conditions.second_constant === 4000
  );
  divideCombinatorEntity.control_behavior.arithmetic_conditions.second_constant =
    40 * item.stack_size;

  return bpCloned;
}

function buildItemLoadingStation(item) {
  const bpCloned = JSON.parse(JSON.stringify(bp.itemLoadingStation));

  const trainStopEntity = bpCloned.blueprint.entities.find(
    (entity) => entity.name === "train-stop"
  );
  trainStopEntity.station = `[L] [item=${item.name}]`;

  // "signal-each" / 288
  const indicatorCombinatorEntity = bpCloned.blueprint.entities.find(
    (entity) =>
      entity.name === "arithmetic-combinator" &&
      entity.control_behavior.arithmetic_conditions.first_signal?.name ===
        "signal-each" &&
      entity.control_behavior.arithmetic_conditions.operation === "/" &&
      entity.control_behavior.arithmetic_conditions.second_constant === 288
  );
  indicatorCombinatorEntity.control_behavior.arithmetic_conditions.second_constant =
    (6 * 48 * item.stack_size) / 100;

  // "signal-each" / 4000
  const divideCombinatorEntity = bpCloned.blueprint.entities.find(
    (entity) =>
      entity.name === "arithmetic-combinator" &&
      entity.control_behavior.arithmetic_conditions.first_signal?.name ===
        "signal-each" &&
      entity.control_behavior.arithmetic_conditions.operation === "/" &&
      entity.control_behavior.arithmetic_conditions.second_constant === 4000
  );
  divideCombinatorEntity.control_behavior.arithmetic_conditions.second_constant =
    40 * item.stack_size;

  return bpCloned;
}

function buildFluidUnloadingStation(fluid) {
  const bpCloned = JSON.parse(JSON.stringify(bp.fluidUnloadingStation));

  const trainStopEntity = bpCloned.blueprint.entities.find(
    (entity) => entity.name === "train-stop"
  );
  trainStopEntity.station = `[U] [fluid=${fluid.name}]`;

  // 50000 - "signal-I"
  const minusCombinatorEntity = bpCloned.blueprint.entities.find(
    (entity) =>
      entity.name === "arithmetic-combinator" &&
      entity.control_behavior.arithmetic_conditions.first_constant === 50000 &&
      entity.control_behavior.arithmetic_conditions.operation === "-" &&
      entity.control_behavior.arithmetic_conditions.second_signal?.name ===
        "signal-I"
  );
  minusCombinatorEntity.control_behavior.arithmetic_conditions.second_signal.type =
    "fluid";
  minusCombinatorEntity.control_behavior.arithmetic_conditions.second_signal.name =
    fluid.name;

  return bpCloned;
}

function buildFluidLoadingStation(fluid) {
  const bpCloned = JSON.parse(JSON.stringify(bp.fluidLoadingStation));

  const trainStopEntity = bpCloned.blueprint.entities.find(
    (entity) => entity.name === "train-stop"
  );
  trainStopEntity.station = `[L] [fluid=${fluid.name}]`;

  return bpCloned;
}

function findBigElectricPole(bp, opt = { x: 0, y: 0 }) {
  return bp.blueprint.entities.find(
    (entity) =>
      entity.name === "big-electric-pole" &&
      entity.position.x === opt.x &&
      entity.position.y === opt.y
  );
}

function findMediumElectricPole(bp, opt = { x: 0, y: 0 }) {
  return bp.blueprint.entities.find(
    (entity) =>
      entity.name === "medium-electric-pole" &&
      entity.position.x === opt.x &&
      entity.position.y === opt.y
  );
}

function connectElectricPoles(entity1, entity2) {
  entity1.neighbours.push(entity2.entity_number);
  entity2.neighbours.push(entity1.entity_number);
}
