#!/bin/bash
#SBATCH -N 1
#SBATCH --job-name=EXP_CANCER
#SBATCH -o OUTPUT.out
#SBATCH -e STD_ERR.err
#SBATCH -t 11:00:00
#SBATCH --gres=gpu:1
#SBATCH --mem 64G

module load cudnn/5.1
module load cuda80

XDG_RUNTIME_DIR=""
ipnport=$(shuf -i8000-9999 -n1)
ipnip=$(hostname -i)

## print tunneling instructions to jupyter-log-{jobid}.txt
echo -e "\n"
echo    "  Paste ssh command in a terminal on local host (i.e., laptop)"
echo    "  ------------------------------------------------------------"
echo -e "  ssh -N -L $ipnport:$ipnip:$ipnport $USER@$SLURM_SUBMIT_HOST\n"
echo    "  Open this address in a browser on local host; see token below"
echo    "  ------------------------------------------------------------"
echo -e "  localhost:$ipnport                                      \n\n"

## start an ipcluster instance and launch jupyter server
# ipcluster start --daemonize
jupyter-notebook --no-browser --port=$ipnport --ip=$ipnip
