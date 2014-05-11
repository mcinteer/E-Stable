using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using EStable.Models.Wizard;

namespace EStable.Models.Wizard
{
    public class AnimalDetailsWizardBase : StableWizardBase
    {
        // Step Four - Animal Details:
        public List<StableAnimal> StableAnimals { get; set; }

        public AnimalDetailsWizardBase()
        {
            StableAnimals = new List<StableAnimal>();
        }

        
        public void AddStableAnimal(StableAnimal animal)
        {
            StableAnimals.Add(animal);
        }
    }
}