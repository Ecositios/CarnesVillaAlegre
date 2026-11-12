
const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTIoAHMoqmWccj17AgF6EsifzhLeIniYuOy2rI1HparJ4WaGaREjop37RO4Etgv6MexlQzrxjDqPLAf/pub?output=csv&gid=0";

const catalog = document.getElementById("catalog");
const status = document.getElementById("status");
const search = document.getElementById("search");
const categoryFilter = document.getElementById("categoryFilter");

let products = [];

function normalize(value) {
    return String(value || "")
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[\s_-]+/g, "");
}

function getValue(row, aliases) {
    const keys = Object.keys(row);

    for (const alias of aliases) {
        const key = keys.find(k => normalize(k) === normalize(alias));

        if (key && String(row[key] || "").trim()) {
            const value = String(row[key]).trim();
            return value === "-" ? "" : value;
        }
    }

    return "";
}

function formatPrice(value) {
    if (!value || String(value).trim() === "-") return "";

    let raw = String(value).trim();

    // Elimina decimales .00 o ,00
    raw = raw.replace(/[.,]00$/, "");

    // Conserva solamente los dígitos
    const number = Number(raw.replace(/[^\d-]/g, ""));

    return Number.isFinite(number)
        ? number.toLocaleString("es-CL", {
            style: "currency",
            currency: "CLP",
            maximumFractionDigits: 0
        })
        : "";
}

// GENERAR FILTRO DE CATEGORÍAS

function loadCategories() {
    const categories = new Map();

    products.forEach(row => {
        const category = getValue(row, ["Imagen / sección"]);

        if (category && !categories.has(normalize(category))) {
            categories.set(normalize(category), category);
        }
    });

    categoryFilter.innerHTML =
        '<option value="">Todas las categorías</option>';

    categories.forEach(category => {
        const option = document.createElement("option");
        option.value = normalize(category);
        option.textContent = category;
        categoryFilter.appendChild(option);
    });
}

// MOSTRAR PRODUCTOS

function render() {
    const term = normalize(search.value);
    const selectedCategory = categoryFilter.value;

    const filtered = products.filter(row => {
        const name = getValue(row, ["Descripción original"]);
        const category = getValue(row, ["Imagen / sección"]);

        const matchesSearch =
            normalize(name + " " + category).includes(term);

        const matchesCategory =
            !selectedCategory ||
            normalize(category) === selectedCategory;

        return matchesSearch && matchesCategory;
    });

    catalog.innerHTML = "";

    status.textContent =
        filtered.length + " de " + products.length + " productos";

    if (!filtered.length) {
        catalog.innerHTML =
            '<div class="empty">No hay productos que coincidan con los filtros.</div>';
        return;
    }

    filtered.forEach(row => {
        const name = getValue(row, ["Descripción original"]) || "Producto";
        const category = getValue(row, ["Imagen / sección"]);
        const price1 = getValue(row, ["1-5 CJ / Chorti"]);
        const price2 = getValue(row, ["6-15 CJ / Chorti 3+"]);
        const image = getValue(row, ["imagenURL"]);

        const card = document.createElement("article");
        card.className = "product";

        if (image) {
            const img = document.createElement("img");
            img.src = image;
            img.alt = name;
            img.loading = "lazy";

            img.onerror = () => {
                const placeholder = document.createElement("div");
                placeholder.className = "placeholder";
                placeholder.textContent = "Imagen no disponible";
                img.replaceWith(placeholder);
            };

            card.appendChild(img);
        } else {
            const placeholder = document.createElement("div");
            placeholder.className = "placeholder";
            placeholder.textContent = "Sin imagen";
            card.appendChild(placeholder);
        }

        const info = document.createElement("div");
        info.className = "info";

        if (category) {
            const cat = document.createElement("div");
            cat.className = "category";
            cat.textContent = category;
            info.appendChild(cat);
        }

        const title = document.createElement("h2");
        title.className = "name";
        title.textContent = name;
        info.appendChild(title);

        if (price1 || price2) {
            const prices = document.createElement("div");
            prices.className = "prices";

            if (price1) {
                const p1 = document.createElement("p");
                p1.className = "price";
                p1.textContent =
                    "1-5 CJ / Chorti: " + formatPrice(price1);
                prices.appendChild(p1);
            }

            if (price2) {
                const p2 = document.createElement("p");
                p2.className = "price";
                p2.textContent =
                    "6-15 CJ / Chorti 3+: " + formatPrice(price2);
                prices.appendChild(p2);
            }

            info.appendChild(prices);
        }

        card.appendChild(info);
        catalog.appendChild(card);
    });
}

// CARGAR CATÁLOGO DESDE GOOGLE SHEETS

async function loadCatalog() {
    try {
        const response = await fetch(
            CSV_URL + "&_=" + Date.now(),
            { cache: "no-store" }
        );

        if (!response.ok) {
            throw new Error("Error al consultar Google Sheets");
        }

        const csv = await response.text();

        Papa.parse(csv, {
            header: true,
            skipEmptyLines: true,

            complete: results => {
                products = results.data;

                loadCategories();
                render();
            },

            error: error => {
                console.error(error);
                status.textContent = "Error al leer los datos";
            }
        });

    } catch (error) {
        console.error(error);
        status.textContent = "No se pudo cargar";

        catalog.innerHTML =
            '<div class="empty">No se pudo conectar con el catálogo.</div>';
    }
}

// EVENTOS DE BÚSQUEDA Y FILTRO

search.addEventListener("input", render);
categoryFilter.addEventListener("change", render);

loadCatalog();
