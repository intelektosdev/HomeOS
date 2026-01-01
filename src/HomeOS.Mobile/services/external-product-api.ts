import axios from 'axios';

export interface ScannedProduct {
    barcode: string;
    name: string;
    image?: string;
    found: boolean;
}

export const fetchProductFromOpenFoodFacts = async (barcode: string): Promise<ScannedProduct> => {
    try {
        const response = await axios.get(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`);

        if (response.data && response.data.status === 1) {
            const product = response.data.product;
            return {
                barcode,
                name: product.product_name || product.product_name_pt || 'Produto sem nome',
                image: product.image_url,
                found: true
            };
        }
    } catch (error) {
        console.warn(`Erro ao buscar produto ${barcode}:`, error);
    }

    return {
        barcode,
        name: '',
        found: false
    };
};
