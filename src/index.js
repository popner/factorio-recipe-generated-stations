import "./styles.css";
import { buildCityBlockFromRecipe } from "./blueprint";

// This script generates loading/unloading stations for a 96 x 96 rail city block
document
  .getElementById("buildCityBlockButton")
  .addEventListener("click", () => {
    const recipeData = JSON.parse(document.getElementById("recipeData").value);
    document.getElementById("bpString").innerHTML = buildCityBlockFromRecipe(
      recipeData
    );
  });
