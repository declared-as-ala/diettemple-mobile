import type { Recipe } from '../types';
export type CategoryFilter = 'all' | 'proteine' | 'rapide' | 'faible_kcal' | 'petit_dej' | 'dejeuner' | 'diner';
export type RecipeSelection = { category: CategoryFilter; prep: string; days: string; ingredients: string[]; match: 'partial' | 'all'; sort: 'recent' | 'time' | 'calories' };
export const DEFAULT_RECIPE_SELECTION: RecipeSelection = { category: 'all', prep: 'all', days: 'all', ingredients: [], match: 'partial', sort: 'recent' };
export const RECIPE_CATEGORIES: { key: CategoryFilter; label: string }[] = [{ key: 'all', label: 'Tout' },{ key: 'proteine', label: '≥ 20 g protéines' },{ key: 'rapide', label: '≤ 15 min' },{ key: 'faible_kcal', label: '< 300 kcal' },{ key: 'petit_dej', label: 'Petit-déjeuner' },{ key: 'dejeuner', label: 'Déjeuner' },{ key: 'diner', label: 'Dîner' }];
export const normalizeRecipeText = (value: string) => value.toLowerCase().replace(/œ/g,'oe').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim();
const ingredientKey = (value: string) => normalizeRecipeText(value).replace(/\boeufs\b/g,'oeuf').replace(/\btomates\b/g,'tomate').replace(/\blegumes\b/g,'legume').replace(/\bpommes\b/g,'pomme').replace(/\bbananes\b/g,'banane');
export function matchesRecipeCategory(recipe: Recipe, category: CategoryFilter) {
 if(category==='all')return true;
 if(category==='proteine')return typeof recipe.protein==='number' && recipe.protein>=20;
 if(category==='faible_kcal')return typeof recipe.calories==='number' && recipe.calories>=0 && recipe.calories<300;
 if(category==='rapide')return typeof recipe.preparationTimeMinutes==='number' && recipe.preparationTimeMinutes<=15;
 const tags=(recipe.tags||[]).map(normalizeRecipeText);
 if(category==='petit_dej')return tags.some(t=>/\b(petit dej(?:euner)?|breakfast)\b/.test(t));
 if(category==='dejeuner')return tags.some(t=>!t.includes('petit')&&/\b(dejeuner|lunch)\b/.test(t));
 return tags.some(t=>/\b(diner|dinner)\b/.test(t));
}
export function selectRecipes(recipes: Recipe[], selection: RecipeSelection, search: string, favoriteIds: string[], favoritesOnly: boolean): Recipe[] {
 const available=new Set(selection.ingredients.map(ingredientKey));const query=normalizeRecipeText(search);
 let result=recipes.filter(r=>!favoritesOnly||favoriteIds.includes(r._id)).filter(r=>{
  const names=(r.ingredients||[]).map(i=>typeof i==='string'?i:i.name);
  if(query&&!normalizeRecipeText([r.title,...names].join(' ')).includes(query))return false;
  if(!matchesRecipeCategory(r,selection.category))return false;
  if(selection.prep!=='all'){const t=r.preparationTimeMinutes;if(typeof t!=='number'||(selection.prep==='45+'?t<=45:t>Number(selection.prep)))return false;}
  if(selection.days==='today'&&(r.mealPrepDays||[]).length)return false;
  if(selection.days!=='all'&&selection.days!=='today'&&!(r.mealPrepDays||[]).includes(Number(selection.days)))return false;
  return true;
 }).map(r=>{
  if(!available.size)return {...r,ingredientMatch:undefined};
  const required=[...new Set((r.ingredients||[]).map(i=>ingredientKey(typeof i==='string'?i:(i.normalizedName||i.name))).filter(Boolean))];
  const missing=required.filter(i=>!available.has(i));const present=required.length-missing.length;
  return {...r,ingredientMatch:{availableCount:present,totalRequired:required.length,missingCount:missing.length,missingIngredients:missing,matchPercentage:required.length?Math.round(present/required.length*100):0}};
 }).filter(r=>!available.size||(selection.match==='all'?r.ingredientMatch!.totalRequired>0&&r.ingredientMatch!.missingCount===0:r.ingredientMatch!.availableCount>0));
 if(selection.sort==='time') result.sort((a,b)=>(a.preparationTimeMinutes??Infinity)-(b.preparationTimeMinutes??Infinity));
 else if(selection.sort==='calories') result.sort((a,b)=>(a.calories??Infinity)-(b.calories??Infinity));
 else if(available.size) result.sort((a,b)=>b.ingredientMatch!.matchPercentage-a.ingredientMatch!.matchPercentage);
 return result;
}
export async function collectRecipePages(fetchPage: (page:number)=>Promise<{recipes:Recipe[];totalPages:number}>, signal?:AbortSignal):Promise<Recipe[]> {
 const recipes=new Map<string,Recipe>();let page=1,totalPages=1;
 do { if(signal?.aborted)throw new Error('Cancelled'); const data=await fetchPage(page);if(signal?.aborted)throw new Error('Cancelled');data.recipes.forEach(recipe=>recipes.set(recipe._id,recipe));totalPages=data.totalPages;page++; } while(page<=totalPages);
 return [...recipes.values()];
}
