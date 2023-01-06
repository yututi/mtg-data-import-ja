"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const request_1 = __importDefault(require("request"));
const JSONStream_1 = __importDefault(require("JSONStream"));
const event_stream_1 = __importDefault(require("event-stream"));
require('dotenv').config();
const prisma = new client_1.PrismaClient();
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        yield prisma.card.deleteMany({});
        const allCard = [];
        // fs.createReadStream('PioneerAtomic.json')
        (0, request_1.default)({ url: process.env.JSON_URL || "" })
            .pipe(JSONStream_1.default.parse('data.*'))
            .pipe(event_stream_1.default.mapSync((cards) => {
            allCard.push(...cards);
            return cards;
        }))
            .on("end", () => __awaiter(this, void 0, void 0, function* () {
            console.log(`batch insert ${allCard.length}`);
            yield prisma.card.createMany({
                data: allCard
                    .filter(card => card.foreignData.filter(data => data.language === "Japanese").length > 0)
                    .map(card => {
                    const localizedData = card.foreignData.filter(data => data.language === "Japanese").pop();
                    return {
                        colorIdentities: card.colorIdentity,
                        cardTypeJa: localizedData.type || "",
                        isLegendary: card.types.includes("legendary"),
                        loyalty: card.loyalty,
                        manaCost: card.manaCost,
                        manaValue: card.manaValue,
                        name: localizedData.name,
                        power: card.power,
                        toughness: card.toughness,
                        subTypes: card.subtypes,
                        superTypes: card.supertypes,
                        types: card.types,
                        flavorText: localizedData.text,
                        text: localizedData.text
                    };
                })
            });
        }));
    });
}
main();
