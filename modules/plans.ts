import { Plan } from "gearworks";

/**
 * A list of plans that a new user can subscribe to, or a current user can switch to.
 * All plans in this list will appear on the pricing page.
 */
const Plans: Plan[] = [
    {
        id: "0696abc9-43e2-4915-822a-895de5ede035",
        price_per_100: 1.00,
        name: "Basic",
        number_of_free_prompts: 100,
        price_cap: 25.00
    },
]

export default Plans;

/**
 * A list of plans that were previously available and possibly still in use by one or more users.
 * No plan in this list will appear on the pricing page.
 */
export const RetiredPlans: Plan[] = [

]

/**
 * Finds a plan with the given id, whether it's a current or retired plan.
 */
export function findPlan(id: string) {
    const plan = Plans.find(p => p.id === id) || RetiredPlans.find(p => p.id === id);

    if (!plan) {
        throw new Error(`Unable to find plan with id of ${id}.`);
    }

    return plan;
}

/**
 * Builds a simple plan description string in the format of `100 free prompts each month, then $1.00 USD per 100 prompts.`
 */
export function getPlanDescription(p: Plan) {
    return `${p.number_of_free_prompts} free prompts each month, then $${p.price_per_100.toFixed(2)} USD per 100 prompts.`;
}

/**
 * Builds a UsageCharge terms string for use with Shopify's usage charge API.
 */
export function getPlanTerms(p: Plan) {
    return `Your first ${p.number_of_free_prompts} prompts each month are free, then your shop will be charged $${p.price_per_100.toFixed(2)} USD per 100 prompts`;
}