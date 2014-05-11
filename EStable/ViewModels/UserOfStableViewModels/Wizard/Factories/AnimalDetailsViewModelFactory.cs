using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using EStable.Models;
using EStable.Models.Wizard;
using EStable.ViewModels.UserOfStableViewModels.Wizard.StepFour;

namespace EStable.ViewModels.UserOfStableViewModels.Wizard.Factories
{
    public interface IAnimalDetailsViewModelFactory
    {
        AnimalDetailsViewModel ToViewModel(AnimalDetailsWizardBase animalDetails);
    }
    public interface IAnimalViewModelFactory
    {
        
        List<AnimalViewModel> ToViewModel(List<StableAnimal> stableAnimals);
    }

    public class AnimalViewModelFactory : IAnimalViewModelFactory
    {
        public List<AnimalViewModel> ToViewModel(List<StableAnimal> animalDetails)
        {
            return animalDetails.Select(ToViewModel).ToList();
        }
        
        private static AnimalViewModel ToViewModel(StableAnimal animal)
        {
            return new AnimalViewModel()
                {
                    RacingName = animal.RacingName,
                    StableName = animal.StableName,
                    Colour = animal.Colour,
                    Dam = animal.Dam,
                    DateOfBirth = animal.DateOfBirth,
                    Gender = animal.Gender,
                    Markings = animal.Markings,
                    Sire = animal.Sire
                };
        }
    }
    
    public class AnimalDetailsViewModelFactory : IAnimalDetailsViewModelFactory
    {
        private readonly IAnimalViewModelFactory _animalViewModelFactory = new AnimalViewModelFactory();

        public AnimalDetailsViewModel ToViewModel(AnimalDetailsWizardBase animalDetails)
        {
            return new AnimalDetailsViewModel()
                {
                    Animals = _animalViewModelFactory.ToViewModel(animalDetails.StableAnimals),
                    Email = animalDetails.Email,
                    StableName = animalDetails.StableName
                };
        }
    }
}