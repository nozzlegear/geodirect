declare module "gearworks/requests" {
    // #region /integrations/shopify

    export interface CreateOrderRequest {
        city: string; 
        email: string; 
        line_item: string; 
        name: string; 
        quantity: number; 
        state: string; 
        street: string; 
        zip: string;
    }

    //#endregion

    // #region /users

    export interface ActivatePlanRequest {
        plan_id: string;
        charge_id: number;
    }

    //#endregion

    // #region /geodirects

    export interface LogPromptRequest {
        rev: string;
        shop_id: number;
    }

    // #endregion
}