using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using EStable.Services;
using EStable.ViewModels.UserOfStableViewModels.Wizard.StepFour;

namespace EStable.Bouncers
{
    public interface IStableAnimalBouncer
    {
        List<AnimalViewModel> SaveAnimal(string racingName, string stableName, string sire, string dam, string gender, string dateOfBirth, string colour, string markings, string email);
    }

    public class StableAnimalBouncer : IStableAnimalBouncer
    {
        private readonly IStableAnimalService _service = new StableAnimalService();

        public List<AnimalViewModel> SaveAnimal(string racingName, string stableName, string sire, string dam, string gender, string dateOfBirth,
                               string colour, string markings, string email)
        {
            return _service.SaveAnimal(racingName, stableName, sire, dam, gender,
                                       dateOfBirth, colour, markings, email);
        }
    }
}