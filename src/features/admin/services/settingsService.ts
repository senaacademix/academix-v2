import prisma from "@/lib/prisma";
import { cache } from "react";

export const getCachedSystemSettings = cache(async () => {
    return await prisma.systemSettings.findUnique({
        where: { id: "settings" }
    });
});

export const settingsService = {
    async getSettings() {
        let settings = await prisma.systemSettings.findUnique({
            where: { id: "settings" }
        });

        if (!settings) {
            settings = await prisma.systemSettings.create({
                data: { id: "settings" }
            });
        }

        return settings;
    },

    async updateSettings(data: any) {
        const settings = await prisma.systemSettings.upsert({
            where: { id: "settings" },
            update: data,
            create: { id: "settings", ...data }
        });



        return settings;
    }
};
