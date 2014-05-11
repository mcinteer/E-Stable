using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using EStable.Models;
using EStable.Repositories;
using EStable.ViewModels.UserOfStableViewModels.Wizard.Factories;
using EStable.ViewModels.UserOfStableViewModels.Wizard.StepFour;

namespace EStable.Services
{
    public interface IStableAnimalService
    {
        List<AnimalViewModel> SaveAnimal(string racingName, string stableName, string sire, string dam, string gender, string dateOfBirth, string colour, string markings, string email);
    }

    public class StableAnimalService : IStableAnimalService
    {
        private readonly WizardService _wizardService =
            new WizardService();
        private readonly IAnimalViewModelFactory _factory =
            new AnimalViewModelFactory();

        public List<AnimalViewModel> SaveAnimal(string racingName, string stableName, string sire, string dam, string gender, string dateOfBirth,
                               string colour, string markings, string email)
        {
            var wizard = _wizardService.GetWizard(email);
            var animal = new StableAnimal(racingName, stableName, sire, dam, gender, dateOfBirth, colour, markings);
            wizard.AddStableAnimal(animal);

            var fileName = _wizardService.GetStableRegFileInfo(email);
            wizard.SaveXml(fileName.SystemFileName);

            return _factory.ToViewModel(wizard.AnimalDetails.StableAnimals);
        }
    }
}