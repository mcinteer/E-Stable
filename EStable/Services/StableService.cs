using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using EStable.Models;
using EStable.Repositories;

namespace EStable.Services
{
    public class StableService
    {
        private readonly StableRepository _stableRepository = new StableRepository();
        public void SaveStable(Stable stable)
        {
            _stableRepository.Save(stable);
        }

        public Stable GetStable(string legalEntity)
        {
            return _stableRepository.GetByLegalEntity(legalEntity);
        }

        public void UpdateStable(Stable stable)
        {
            _stableRepository.Update(stable);
        }
    }
}