"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { addSoup, getLocations } from "@/app/actions";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, X } from "lucide-react";

type LocationPrice = {
  locationId: string;
  prijs: string;
};

export function AddSoupDialog() {
  const [open, setOpen] = useState(false);
  const [locations, setLocations] = useState<{ id: number; naam: string }[]>(
    []
  );
  const [locationPrices, setLocationPrices] = useState<LocationPrice[]>([
    { locationId: "", prijs: "" },
  ]);

  useEffect(() => {
    getLocations().then(setLocations);
  }, []);

  const addLocationPrice = () => {
    setLocationPrices([...locationPrices, { locationId: "", prijs: "" }]);
  };

  const removeLocationPrice = (index: number) => {
    setLocationPrices(locationPrices.filter((_, i) => i !== index));
  };

  const updateLocationPrice = (
    index: number,
    field: keyof LocationPrice,
    value: string
  ) => {
    const newLocationPrices = [...locationPrices];
    newLocationPrices[index] = { ...newLocationPrices[index], [field]: value };
    setLocationPrices(newLocationPrices);
  };

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    // Add location prices to form data
    locationPrices.forEach((lp, index) => {
      formData.append(`locationPrices[${index}][locationId]`, lp.locationId);
      formData.append(`locationPrices[${index}][prijs]`, lp.prijs);
    });

    try {
      await addSoup(formData);
      setOpen(false);
      form.reset();
      setLocationPrices([{ locationId: "", prijs: "" }]);
    } catch (error) {
      console.error("Error adding soup:", error);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Nieuwe Soep</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Nieuwe Soep Toevoegen</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="naam" className="text-right">
              Naam
            </Label>
            <Input
              id="naam"
              name="naam"
              className="col-span-3"
              placeholder="Naam van de soep"
              required
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="vegetarisch" className="text-right">
              Vegetarisch
            </Label>
            <Checkbox
              id="vegetarisch"
              name="vegetarisch"
              value="true"
              className="col-span-3"
            />
          </div>

          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="datum" className="text-right">
              Datum
            </Label>
            <Input
              id="datum"
              name="datum"
              type="date"
              className="col-span-3"
              required
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-right">Locaties & Prijzen</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addLocationPrice}
              >
                <Plus className="h-4 w-4 mr-1" />
                Locatie toevoegen
              </Button>
            </div>

            {locationPrices.map((lp, index) => (
              <div key={index} className="flex gap-2 items-start">
                <div className="flex-1">
                  <select
                    value={lp.locationId}
                    onChange={(e) =>
                      updateLocationPrice(index, "locationId", e.target.value)
                    }
                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                    required
                  >
                    <option value="">Selecteer locatie</option>
                    {locations.map((location) => (
                      <option key={location.id} value={location.id}>
                        {location.naam}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Prijs"
                    value={lp.prijs}
                    onChange={(e) =>
                      updateLocationPrice(index, "prijs", e.target.value)
                    }
                    required
                  />
                </div>
                {locationPrices.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeLocationPrice(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-4 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false);
                setLocationPrices([{ locationId: "", prijs: "" }]);
              }}
            >
              Annuleren
            </Button>
            <Button type="submit">Toevoegen</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
